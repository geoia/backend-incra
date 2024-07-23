import consola from 'consola';
import knex from '../../common/knex';
import { sources } from './queimadas.service';

export async function estatisticasQueimadas(source: string, tipo: string) {
  const tabela_queimadas = `dados_queimadas_${tipo}`;

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

    let referencias: any;
    let current_ogc_fid = -1;

    if (ogc_fidSet.size == 0) {
      return;
    }
    while (1) {
      const ogc_id = ogc_iterator.next();
      if (ogc_id.done) return;
      current_ogc_fid = ogc_id.value;
      referencias = await knex.raw(
        `SELECT id FROM mapas_${tipo} mm WHERE ST_INTERSECTS((select mq.wkb_geometry from mapas_queimadas_${source} mq 
          where ogc_fid = ${ogc_id.value}), mm.wkb_geometry)`
      );

      if (referencias == undefined || referencias.rows[0] == undefined) {
        ogc_fidSet.delete(ogc_id.value);
        continue;
      } else {
        break;
      }
    }

    if (current_ogc_fid == -1) {
      break;
    }

    if (referencias == undefined || referencias.rows[0] == undefined) continue;

    if (referencias.rows.length > 1) {
      await knex.transaction(async (trx) => {
        for (let i = 1; i < referencias.length; i++) {
          await trx.schema.withSchema('public').raw(`
          insert into ${tabela_queimadas}
          SELECT 
            mq.ogc_fid,
            ${referencias.rows[i].id},
            ST_AREA(st_intersection(
            	mq.wkb_geometry,
	           (select mm.wkb_geometry from mapas_${tipo} mm where id = ${referencias.rows[i].id})
	          ), true),
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
              ST_INTERSECTS(mq.wkb_geometry, (select mm.wkb_geometry FROM mapas_${tipo} mm where id = ${
        referencias.rows[0].id
      })) `
    );

    await knex.transaction(async (trx) => {
      consola.info(
        'INSERINDO ' +
          queimadasNoMunicipio.rows.length +
          ' QUEIMADAS DO MUNICIPIO ' +
          referencias.rows[0].id
      );
      await trx.schema.withSchema('public').raw(`
          insert into ${tabela_queimadas}
          SELECT 
            mq.ogc_fid,
            ${referencias.rows[0].id},
            ST_AREA(st_intersection(
            	mq.wkb_geometry,
	           (select mm.wkb_geometry from mapas_${tipo} mm where id = ${referencias.rows[0].id})
	          ), true),
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

async function createTables(override: boolean, tipo: string) {
  const tabela_queimadas = `dados_queimadas_${tipo}`;
  const tabela_estatisticas = `estatisticas_queimadas_${tipo}`;

  const hasDadosTable = await knex.schema.withSchema('public').hasTable(tabela_queimadas);
  const hasEstatisticasTable = await knex.schema.withSchema('public').hasTable(tabela_estatisticas);

  await knex.transaction(async (trx) => {
    if (override) {
      consola.info('Deletando dados antigos...');
      if (hasDadosTable) await trx.schema.withSchema('public').dropTableIfExists(tabela_queimadas);
      if (hasEstatisticasTable)
        await trx.schema.withSchema('public').dropTableIfExists(tabela_estatisticas);
    }

    await trx.schema.withSchema('public').raw(`
        create or replace function adicionar_estatistica_${tipo}() returns trigger as $$
        declare 
          existe integer;
        begin
          select count(*) INTO existe from ${tabela_estatisticas} dd
          where dd.mes = NEW.mes and dd.ano = NEW.ano and dd.referencia_id = NEW.referencia_id;
          IF existe != 0 THEN
                  update ${tabela_estatisticas} set 
                  total_area_queimada = total_area_queimada + new.area_queimada,
                  total_focos_queimada = total_focos_queimada + 1
                  where mes = NEW.mes and ano = NEW.ano and referencia_id = NEW.referencia_id;
              else
                insert into ${tabela_estatisticas}
                (referencia_id, total_area_queimada, total_focos_queimada, mes, ano) values
                (new.referencia_id, new.area_queimada, 1, new.mes, new.ano);
              END IF;
          return new;
        end;
      $$ language PLPGSQL;
    `);

    if (!hasDadosTable || override) {
      await trx.schema.withSchema('public').raw(`
          create table ${tabela_queimadas}(
              queimada_id int4 null,
              referencia_id int4 null,
              area_queimada DOUBLE PRECISION ,
              mes smallint,
              ano smallint,
              FOREIGN KEY(referencia_id)
              REFERENCES mapas_${tipo}(id)
              ON DELETE CASCADE
          )
          `);
      await trx.schema.withSchema('public').raw(`
          CREATE TRIGGER add_estatistica AFTER INSERT
          ON public.${tabela_queimadas}
          FOR EACH ROW
            execute FUNCTION adicionar_estatistica_${tipo}()
          `);
    }

    if (!hasEstatisticasTable || override) {
      await trx.schema.withSchema('public').raw(`
          create table ${tabela_estatisticas}(
              referencia_id int4 null,
              total_area_queimada DOUBLE PRECISION,
              total_focos_queimada bigint,
              mes smallint,
              ano smallint,
              FOREIGN KEY(referencia_id) 
              REFERENCES mapas_${tipo}(id)
              ON DELETE CASCADE
          )
          `);
    }
  });
}

export async function processarEstatisticas(override: boolean) {
  await Promise.all([
    // createTables(override, 'biomas'),
    createTables(override, 'municipios'),
  ]);

  const sourcesList: Array<{ year: number; month: number }> = await sources();
  const data = Date.now();

  for (let index = 0; index < sourcesList.length; index++) {
    await Promise.all([
      // estatisticasQueimadas(String(sourcesList[index]), 'biomas'),
      estatisticasQueimadas(String(sourcesList[index]), 'municipios'),
    ]);
  }

  consola.info('Processo finalizado em ' + (Date.now() - data) / 1000 + 's');
}

export default { estatisticasQueimadas, processarEstatisticas };
