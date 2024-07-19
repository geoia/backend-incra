import consola from 'consola';
import knex from '../../common/knex';
import { sources } from './queimadas.service';

export async function estatisticasQueimadas(source: string) {
  consola.info('Processando estatisticas de ' + source);
  const year = source.slice(0, 4);
  const month = Number(source.slice(4, 6));

  // const { rows } = await knex.raw(`SELECT ogc_fid FROM mapas_queimadas_${source}`);
  //

  const { rows } = await knex.raw(
    `select mq.ogc_fid from mapas_queimadas_${source} mq where ST_INTERSECTS(mq.wkb_geometry, (select mb.wkb_geometry from mapa_brasil mb LIMIT 1))`
  );
  const ogc_fidSet: Set<number> = new Set<number>();
  rows.map((row: { ogc_fid: number }) => ogc_fidSet.add(row.ogc_fid));
  while (true) {
    consola.info(`PROGRESSO: ${ogc_fidSet.size} restantes`);
    const ogc_iterator = ogc_fidSet.values();
    if (ogc_iterator.next().done) break;

    let municipioId: any;
    let current_ogc_fid = -1;

    if (ogc_fidSet.size == 0) {
      return;
    }

    while (1) {
      const ogc_id = ogc_iterator.next();
      if (ogc_id.done) break;
      current_ogc_fid = ogc_id.value;

      municipioId = await knex.raw(
        `SELECT id FROM mapas_municipios mm WHERE ST_INTERSECTS((select mq.wkb_geometry from mapas_queimadas_${source} mq where ogc_fid = ${ogc_id.value}), mm.wkb_geometry)`
      );

      if (municipioId == undefined || municipioId.rows[0] == undefined) {
        ogc_fidSet.delete(ogc_id.value);
        continue;
      } else {
        break;
      }
    }

    if (current_ogc_fid == -1) {
      break;
    }

    if (municipioId == undefined || municipioId.rows[0] == undefined) continue;

    if (municipioId.rows.length > 1) {
      await knex.transaction(async (trx) => {
        for (let i = 1; i < municipioId.length; i++) {
          await trx.schema.withSchema('public').raw(`
          insert into dados_queimadas
          SELECT 
            mq.ogc_fid,
            ${municipioId.rows[i].id},
            ST_AREA(st_intersection(
            	mq.wkb_geometry,
	           (select mm.wkb_geometry from mapas_municipios mm where id = 1100338)
	          )),
            ${month},
            ${year} from mapas_queimadas_${source} mq 
          WHERE ogc_fid = ${current_ogc_fid}
        `);
        }
      });
    }

    const queimadasNoMunicipio = await knex.raw(
      `SELECT mq.ogc_fid from mapas_queimadas_${source} mq 
           WHERE mq.ogc_fid in (${Array.from(ogc_fidSet)}) and
              ST_INTERSECTS(mq.wkb_geometry, (select mm.wkb_geometry FROM mapas_municipios mm where id = ${municipioId.rows[0].id
      })) `
    );

    await knex.transaction(async (trx) => {
      consola.info(
        'INSERINDO ' +
        queimadasNoMunicipio.rows.length +
        ' QUEIMADAS DO MUNICIPIO ' +
        municipioId.rows[0].id
      );
      await trx.schema.withSchema('public').raw(`
          insert into dados_queimadas
          SELECT 
            mq.ogc_fid,
            ${municipioId.rows[0].id},
            ST_AREA(st_intersection(
            	mq.wkb_geometry,
	           (select mm.wkb_geometry from mapas_municipios mm where id = 1100338)
	          )),
            ${month},
            ${year} from mapas_queimadas_${source} mq 
          WHERE ogc_fid in (${queimadasNoMunicipio.rows.map(
        (row: { ogc_fid: number }) => row.ogc_fid
      )})
        `);
    });
    queimadasNoMunicipio.rows.map(async (row: { ogc_fid: number }) => {
      ogc_fidSet.delete(row.ogc_fid);
    });
  }

  consola.info(`PROCESSAMENTO FINALIZADO PARA ${source}`);
}

async function createTables(override: boolean) {
  const hasDadosTable = await knex.schema.withSchema('public').hasTable('dados_queimadas');
  const hasEstatisticasTable = await knex.schema
    .withSchema('public')
    .hasTable('dados_estatisticos_queimadas');

  await knex.transaction(async (trx) => {
    if (override) {
      consola.info('Deletando dados antigos...');
      if (hasDadosTable) await trx.schema.withSchema('public').dropTableIfExists('dados_queimadas');
      if (hasEstatisticasTable)
        await trx.schema.withSchema('public').dropTableIfExists('dados_estatisticos_queimadas');
    }

    await trx.schema.withSchema('public').raw(`
        create or replace function add_area() returns trigger as $$
        declare 
          existe integer;
        begin
          select count(*) INTO existe from dados_estatisticos_queimadas dd
          where dd.mes = NEW.mes and dd.ano = NEW.ano and dd.municipio_id = NEW.municipio_id;
          IF existe != 0 THEN
                  update dados_estatisticos_queimadas set 
                  total_area_queimada = total_area_queimada + new.area_queimada,
                  total_focos_queimada = total_focos_queimada + 1
                  where mes = NEW.mes and ano = NEW.ano and municipio_id = NEW.municipio_id;
              else
                insert into dados_estatisticos_queimadas
                (municipio_id, total_area_queimada, total_focos_queimada, mes, ano) values
                (new.municipio_id, new.area_queimada, 1, new.mes, new.ano);
              END IF;
          return new;
        end;
      $$ language PLPGSQL;
    `);

    if (!hasDadosTable || override) {
      await trx.schema.withSchema('public').raw(`
          create table dados_queimadas(
              queimada_id int4 null,
              municipio_id int4 null,
              area_queimada DOUBLE PRECISION ,
              mes smallint,
              ano smallint,
              FOREIGN KEY(municipio_id)
              REFERENCES mapas_municipios(id)
          )
          `);
      await trx.schema.withSchema('public').raw(`
          CREATE TRIGGER add_estatistica AFTER INSERT
          ON public.dados_queimadas
          FOR EACH ROW
            execute FUNCTION add_area()
          `);
    }

    if (!hasEstatisticasTable || override) {
      await trx.schema.withSchema('public').raw(`
          create table dados_estatisticos_queimadas(
              municipio_id int4 null,
              total_area_queimada DOUBLE PRECISION,
              total_focos_queimada bigint,
              mes smallint,
              ano smallint,
              FOREIGN KEY(municipio_id) 
              REFERENCES mapas_municipios(id)
          )
          `);
    }
  });
}

export async function processarEstatisticas(override: boolean) {
  await createTables(override);
  const sourcesList: Array<{ year: number; month: number }> = await sources();
  const data = Date.now();
  for (let index = 0; index < sourcesList.length; index++) {
    await estatisticasQueimadas(String(sourcesList[index]));
  }
  consola.info((Date.now() - data) / 1000 + 's');
}

export default { estatisticasQueimadas, processarEstatisticas };
