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
  const source = opts.source ? formatSource(opts.source) : await latestSource();

  const { rows } = await knex.raw(
    `
    SELECT COUNT(m.fid) AS count FROM mapas_queimadas${opts.source ? `_${opts.source}` : ''} m
    JOIN dados_queimadas_${type}s dqm on dqm.queimada_id = m.ogc_fid
    WHERE dqm.referencia_id = ${id} and dqm.ano = ${source.year} and dqm.mes = ${source.month}
    `
  );
  return rows.at(0).count as number;
}

export async function sources(): Promise<Array<{ year: number; month: number }>> {
  const { rows } = await knex.raw(`
    SELECT prefix FROM mapas_queimadas_historico order by "year" , "month" 
  `);

  return rows.map((row: { prefix: string }) => row.prefix);
}

export function formatSource(source: string): {
  year: string;
  month: string;
} {
  return { year: source?.slice(0, 4), month: source?.slice(4) };
}

export async function latestSource(): Promise<{ year: number; month: number }> {
  const { rows } = await knex.raw(
    `SELECT h.year , h.month FROM mapas_queimadas_historico h order by h.year DESC, h.month desc limit 1`
  );
  return rows[0];
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
  const source = opts.source ? formatSource(opts.source) : await latestSource();

  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_CollectionHomogenize(ST_Collect(${simplifyFn('sm.geom')})), 6) AS geojson
    FROM (
      SELECT m.wkb_geometry AS geom FROM mapas_queimadas_${opts.source} m
      join dados_queimadas_${type}s dqm on dqm.queimada_id = m.ogc_fid
      WHERE dqm.referencia_id = ${id} and dqm.ano = ${source.year} and dqm.mes = ${source.month}
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
