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

export default { count, sources, queimadas };
