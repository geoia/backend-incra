import L from '../../common/logger';
import knex from '../../common/knex';
import { isNil, negate } from 'lodash';
import formatter from '../../common/utils/formatter';
import { resolve, extname} from 'node:path';
import extract from 'decompress';

const isNotNil = negate(isNil);

type BaseHandlerOpts = {
  detailed?: boolean;
  limit?: number;
  page?: number;
};

type LocaleOpts = { source?: string; municipio?: number; estado?: number } & (
  | { municipio: number }
  | { estado: number }
);

type HandlerOpts = BaseHandlerOpts & LocaleOpts;

export async function count(opts: LocaleOpts) {
  const { municipio, estado } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

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
  const { municipio, estado, detailed } = opts;

  let { page, limit } = opts;

  page = ensureValue(page, 1);
  limit = ensureValue(limit, 100);

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];
  const table = `mapas_queimadas${opts.source ? `_${opts.source}` : ''}`;

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id, detailed, page, table })
  );
  const simplifyFn = (text: string) => (detailed ? text : `ST_Simplify(${text}, 0.0001)`);

  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(${simplifyFn(`ST_Union(sm.geom)`)}, 6) AS geojson
    FROM (
      SELECT m.wkb_geometry AS geom FROM ${table} m
      WHERE ST_Within(m.wkb_geometry, (SELECT map.wkb_geometry FROM ${mapa} map WHERE map.id = ${id}))
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    ) sm;
    `
  );

  if (rowCount === 0) return null;

  L.debug('Dados de queimadas prontos, retornando...');
  return JSON.parse(rows[0].geojson);
}

export function saveContent(tempFilePath: string) {
  const dest: string = resolve(__dirname, '..', '..', '..', 'shapefiles', 'queimadas'); 
  return extract(tempFilePath, dest, {
    filter: file => ['.shx', '.shp', '.qmd', '.prj', '.dbf', '.cpg'].includes(extname(file.path))
  });
}

export default { count, sources, queimadas, saveContent };
