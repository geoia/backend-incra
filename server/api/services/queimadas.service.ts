import L from '../../common/logger';
import knex from '../../common/knex';
import formatter from '../../common/utils/formatter';

type BaseHandlerOpts = {
  detailed?: boolean;
  limit?: number;
  page?: number;
};

type LocaleOpts = { source?: string; municipio?: number; estado?: number; bioma?: string } & (
  | { municipio: number }
  | { estado: number }
  | { bioma: string }
);

type HandlerOpts = BaseHandlerOpts & LocaleOpts;

export async function count(opts: LocaleOpts) {
  const { municipio, estado, bioma } = opts;

  let type: 'municipio' | 'estado' | 'bioma';

  if (municipio) type = 'municipio';
  else if (estado) type = 'estado';
  else if (bioma) type = 'bioma';
  else throw new Error('Nenhum critério de busca foi fornecido');

  const mapa = `mapas_${type}s`;
  const id = municipio || estado || `'${bioma}'`;

  L.debug('Obtendo contagem de queimadas usando "%s"...', formatter.object({ mapa, id }));
  const { rows } = await knex.raw(
    `
    SELECT COUNT(m.fid) AS count FROM mapas_queimadas${opts.source ? `_${opts.source}` : ''} m
    WHERE ST_Within(m.wkb_geometry, (SELECT map.wkb_geometry FROM ${mapa} map WHERE map.id = ${id}))
    `
  );

  return rows.at(0).count as number;
}

export async function sources(): Promise<Array<{ year: number; month: number }>> {
  const { rows } = await knex.raw(`
    SELECT prefix FROM mapas_queimadas_historico
  `);

  return rows.map((row: { prefix: string }) => row.prefix);
}

function ensureValue(value: number | undefined, min: number, max?: number) {
  return Math.max(Math.min(value || min, max || Infinity), min);
}

// handler do nextjs
export async function queimadas(opts: HandlerOpts) {
  const { municipio, estado, bioma, detailed } = opts;

  let { page, limit } = opts;

  page = ensureValue(page, 1);
  limit = ensureValue(limit, 100);

  let type: 'municipio' | 'estado' | 'bioma';

  if (municipio) type = 'municipio';
  else if (estado) type = 'estado';
  else if (bioma) type = 'bioma';
  else throw new Error('Nenhum critério de busca foi fornecido');

  const mapa = `mapas_${type}s`;
  const id = municipio || estado || `'${bioma}'`;

  const table = `mapas_queimadas${opts.source ? `_${opts.source}` : ''}`;

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id, detailed, page, table })
  );
  const simplifyFn = (text: string) => (detailed ? text : `ST_SimplifyVW(${text}, 1e-7)`);

  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_CollectionHomogenize(ST_Collect(${simplifyFn('sm.geom')})), 6) AS geojson
    FROM (
      SELECT m.wkb_geometry AS geom FROM ${table} m
      WHERE ST_Within(m.wkb_geometry, (SELECT map.wkb_geometry FROM ${mapa} map WHERE map.id = ${id}))
      ORDER BY m.fid ASC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    ) sm;
    `
  );

  if (rowCount === 0) return null;

  const geojson = JSON.parse(rows[0].geojson);

  L.debug(`Dados de queimadas prontos, retornando ${geojson?.coordinates.length} registros...`);
  return geojson;
}

export async function estatisticasQueimadas(opts: LocaleOpts) {
  console.log(opts);
  const sourcesList = await sources();

  sourcesList.forEach(async (source) => {
    const { rows } = await knex.raw(`SELECT ogc_fid FROM mapas_queimadas_${source}`);
    const ogc_fidList = rows.map((row: { ogc_fid: number }) => row.ogc_fid);

    while (ogc_fidList.length > 0) {
      console.log(ogc_fidList.length);
      let numFocosQueimadas = 0;
      let areaTotalQueimada = 0;

      let municipioId = await knex.raw(
        `SELECT id FROM mapas_municipios mm WHERE ST_WITHIN((select mq.wkb_geometry from mapas_queimadas_${source} mq where ogc_fid = ${ogc_fidList[0]}) , mm.wkb_geometry)`
      );

      while (municipioId.rows[0] == undefined) {
        console.log('municipio não encontrado, id do foco: ', ogc_fidList[0]);
        ogc_fidList.splice(0, 1);

        if (ogc_fidList.length == 0) {
          break;
        }
        municipioId = await knex.raw(
          `SELECT id FROM mapas_municipios mm WHERE ST_WITHIN((select mq.wkb_geometry from mapas_queimadas_${source} mq where ogc_fid = ${ogc_fidList[0]}) , mm.wkb_geometry)`
        );
      }

      if (ogc_fidList.length == 0) {
        break;
      }

      const queimadasNoMunicipio = await knex.raw(
        `SELECT mq.ogc_fid, ST_AREA(mq.wkb_geometry) from mapas_queimadas_${source} mq WHERE ST_WITHIN(mq.wkb_geometry, (select mm.wkb_geometry FROM mapas_municipios mm where id = ${municipioId.rows[0].id}))`
      );

      queimadasNoMunicipio.rows.forEach((row: { ogc_fid: number; st_area: number }) => {
        numFocosQueimadas += 1;
        areaTotalQueimada += row.st_area;
        const i = ogc_fidList.indexOf(row.ogc_fid);
        ogc_fidList.splice(i, 1);
      });

      console.log('DADOS DE QUEIMADAS');
      console.log('ano: ', source);
      console.log('id municipio: ', municipioId.rows[0]);
      console.log('num focos: ', numFocosQueimadas);
      console.log('area queimada: ', areaTotalQueimada);
    }

    console.log('ACABOU');
  });

  return sourcesList;
}

export default { count, sources, queimadas, estatisticasQueimadas };
