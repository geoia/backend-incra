import consola from 'consola';
import knex from '../../common/knex';
import { sources } from './queimadas.service';

async function inserir_queimadas(
  ogc_fids: Array<number>,
  referencias: Array<number>,
  table: string,
  table_referencia: string,
  source: string,
  month: string,
  year: string
) {
  await knex.transaction(async (trx) => {
    for (const ref of referencias) {
      await trx.schema.withSchema('public').raw(`
        insert into ${table}
        SELECT 
          mq.ogc_fid,
          ${ref},
          ST_AREA(st_intersection(
            mq.wkb_geometry,
            (select mm.wkb_geometry from mapas_${table_referencia} mm where ref_id = ${ref})
          ), true),
          ${month},
          ${year} from mapas_queimadas_${source} mq 
        WHERE ogc_fid in (${ogc_fids})
      `);
    }
  });
}

export async function estatisticasQueimadas(source: string, tipo: string) {
  const tabela_queimadas = `dados_queimadas_${tipo}`;
  const year = source.slice(0, 4);
  const month = Number(source.slice(4, 6));

  const foiProcessado = await knex.raw(
    `SELECT count(*) as count FROM ${tabela_queimadas} WHERE mes = ${month} and ano = ${year}`
  );

  if (Number(foiProcessado.rows[0].count) > 0) {
    consola.info(`JÁ PROCESSADO ${source}`);
    return;
  }

  consola.info(`PROCESSANDO ESTATISTICAS DE ${source} PARA ${tipo.toLocaleUpperCase()}`);

  const { rows } = await knex.raw(
    `select mq.ogc_fid from mapas_queimadas_${source} mq where ST_INTERSECTS(mq.wkb_geometry, (select mb.wkb_geometry from mapa_brasil mb LIMIT 1))`
  );
  const ogc_fidSet: Set<number> = new Set<number>();
  rows.map((row: { ogc_fid: number }) => ogc_fidSet.add(row.ogc_fid));

  while (ogc_fidSet.size > 0) {
    const ogc_iterator = ogc_fidSet.values();
    if (ogc_iterator.next().done) break;

    let referencias: any;
    let ogc_fid = -1;

    for (const id of ogc_iterator) {
      referencias = await knex.raw(
        `SELECT ref_id as id FROM mapas_${tipo} mm WHERE ST_INTERSECTS((select mq.wkb_geometry from mapas_queimadas_${source} mq 
          where ogc_fid = ${id}), mm.wkb_geometry)`
      );
      ogc_fid = id;
      if (referencias?.rows[0] != undefined) break;

      ogc_fidSet.delete(Number(id));
    }

    const referencia_id = referencias?.rows?.pop(0)?.id;

    if (ogc_fid == undefined || referencia_id == undefined) {
      break;
    }

    if (referencias.rows.length > 1) {
      await inserir_queimadas(
        [ogc_fid],
        referencias.rows.map((row: { id: number }) => row.id),
        tabela_queimadas,
        tipo,
        source,
        month.toString(),
        year
      );
    }

    const queimadasNoMunicipio = await knex.raw(
      `SELECT mq.ogc_fid from mapas_queimadas_${source} mq 
           WHERE mq.ogc_fid in (${[...ogc_fidSet]}) and
              ST_INTERSECTS(mq.wkb_geometry, (select mm.wkb_geometry FROM mapas_${tipo} mm where ref_id = ${referencia_id})) `
    );

    consola.info(
      `INSERINDO ${queimadasNoMunicipio.rows.length
        .toString()
        .padStart(5, '0')} QUEIMADAS PARA REFERENCIA ${referencia_id.toString().padStart(7, '0')}`
    );

    await inserir_queimadas(
      queimadasNoMunicipio.rows.map((row: { ogc_fid: number }) => row.ogc_fid),
      [referencia_id],
      tabela_queimadas,
      tipo,
      source,
      month.toString(),
      year
    );

    queimadasNoMunicipio.rows.map((row: { ogc_fid: number }) => {
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
              REFERENCES mapas_${tipo}(ref_id)
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
              REFERENCES mapas_${tipo}(ref_id)
              ON DELETE CASCADE
          )
          `);
    }
  });
}

export async function processarEstatisticas(override: boolean) {
  await Promise.all([createTables(override, 'biomas'), createTables(override, 'municipios')]);

  const sourcesList: Array<{ year: number; month: number }> = await sources();
  const data = Date.now();

  await Promise.all(
    sourcesList.map(async (source) => estatisticasQueimadas(String(source), 'municipios'))
  );
  await Promise.all(
    sourcesList.map(async (source) => estatisticasQueimadas(String(source), 'biomas'))
  );

  consola.info('Processo finalizado em ' + (Date.now() - data) / 1000 + 's');
}

export default { estatisticasQueimadas, processarEstatisticas };
