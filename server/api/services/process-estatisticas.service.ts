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

export async function estatisticasQueimadas(source: string, mapa: string) {
  const tabela_queimadas = `dados_queimadas_${mapa}`;
  const year = source.slice(0, 4);
  const month = Number(source.slice(4, 6));

  const foiProcessado = await knex.raw(
    `SELECT count(*) as count FROM ${tabela_queimadas} WHERE mes = ${month} and ano = ${year}`
  );

  if (Number(foiProcessado.rows[0].count) > 0) {
    consola.info(`JÁ PROCESSADO ${source}`);
    return;
  }

  consola.info(`PROCESSANDO ESTATISTICAS DE ${source} PARA ${mapa.toLocaleUpperCase()}`);

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
        `SELECT ref_id as id FROM mapas_${mapa} mm WHERE ST_INTERSECTS((select mq.wkb_geometry from mapas_queimadas_${source} mq 
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
        mapa,
        source,
        month.toString(),
        year
      );
    }

    const queimadasNoMunicipio = await knex.raw(
      `SELECT mq.ogc_fid from mapas_queimadas_${source} mq 
           WHERE mq.ogc_fid in (${[...ogc_fidSet]}) and
              ST_INTERSECTS(mq.wkb_geometry, (select mm.wkb_geometry FROM mapas_${mapa} mm where ref_id = ${referencia_id})) `
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
      mapa,
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

async function criarTabelaDadosQueimadas(override: boolean, mapa: string) {
  const tabela_queimadas = `dados_queimadas_${mapa}`;
  const hasDadosTable = await knex.schema.withSchema('public').hasTable(tabela_queimadas);

  await knex.transaction(async (trx) => {
    if (override) {
      consola.info('Deletando dados antigos...');
      if (hasDadosTable) await trx.schema.withSchema('public').dropTableIfExists(tabela_queimadas);
    }

    if (!hasDadosTable || override)
      await trx.schema.withSchema('public').raw(`
          create table ${tabela_queimadas}(
              queimada_id int4 null,
              referencia_id int4 null,
              area_queimada DOUBLE PRECISION ,
              mes smallint,
              ano smallint,
              FOREIGN KEY(referencia_id)
              REFERENCES mapas_${mapa}(ref_id)
              ON DELETE CASCADE
          )
          `);
  });
}

async function criarTabelaDadosQueimadasEstados() {
  await knex.transaction(async (trx) => {
    await trx.schema.withSchema('public').dropTableIfExists('dados_queimadas_estados');
    await trx.schema.withSchema('public').raw(`
        CREATE TABLE dados_queimadas_estados AS
        SELECT  
          queimada_id, 
          mm.uf_id as referencia_id,
          area_queimada,
          mes,
          ano
        FROM dados_queimadas_municipios dq
        JOIN dados_municipios mm ON mm.id = dq.referencia_id 
      `);
  });
}

async function criarTabelaEstatisticas(mapa: string) {
  await knex.transaction(async (trx) => {
    await trx.schema
      .withSchema('public')
      .raw(`DROP TABLE IF EXISTS estatisticas_queimadas_${mapa}`);
    await trx.schema.withSchema('public').raw(`
        CREATE TABLE estatisticas_queimadas_${mapa} AS
        SELECT 
            referencia_id, 
            SUM(area_queimada) AS total_area_queimada,
            COUNT(*) AS total_focos_queimada,
            ano, 
            mes 
        FROM dados_queimadas_${mapa}
        GROUP BY ano, mes, referencia_id
      `);
  });
}

export async function processarEstatisticas(override: boolean) {
  await Promise.all([
    criarTabelaDadosQueimadas(override, 'biomas'),
    criarTabelaDadosQueimadas(override, 'municipios'),
  ]);

  const sourcesList: Array<{ year: number; month: number }> = await sources();
  const data = Date.now();

  const promises: Array<Promise<void>> = [];

  sourcesList.forEach((source) => {
    promises.push(estatisticasQueimadas(String(source), 'municipios'));
    promises.push(estatisticasQueimadas(String(source), 'biomas'));
  });

  await Promise.all(promises);

  await criarTabelaDadosQueimadasEstados();

  await Promise.all([
    criarTabelaEstatisticas('biomas'),
    criarTabelaEstatisticas('municipios'),
    criarTabelaEstatisticas('estados'),
  ]);

  consola.info('Processo finalizado em ' + (Date.now() - data) / 1000 + 's');
}

export default { estatisticasQueimadas, processarEstatisticas };
