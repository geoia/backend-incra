import L from '../../common/logger';
import knex from '../../common/knex';
import { isNil, negate } from 'lodash';
import formatter from '../../common/utils/formatter';

const isNotNil = negate(isNil);

type LocaleOpts = { municipio?: number; estado?: number } & (
  | { municipio: number }
  | { estado: number }
);

type HandlerOpts = LocaleOpts;

export async function entidadesComDados(
  type: 'mapas_municipios' | 'mapas_estados',
  opts: { source?: string; full?: boolean }
) {
  const tableQueimadas = `mapas_queimadas${opts.source ? `_${opts.source}` : ''}`;
  const joinMode = opts.full ? 'LEFT' : 'INNER';
  const { rowCount, rows } = await knex.raw(
    `
    WITH queimadas AS (SELECT ST_Union(ST_Simplify(mq.wkb_geometry, 0.1, TRUE)) AS wkb_geometry FROM ${tableQueimadas} mq)
    SELECT DISTINCT ma.id, ma.nome, ma.sigla, (mq.wkb_geometry IS NOT NULL) as queimadas 
      FROM ${type} ma ${joinMode} JOIN queimadas mq ON ST_Intersects(ma.wkb_geometry, mq.wkb_geometry)
    `
  );

  if (rowCount === 0) return null;

  return rows;
}

// handler do nextjs
export async function mapas(opts: HandlerOpts) {
  const { municipio, estado } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  L.debug('Obtendo dados de queimadas usando "%s"...', formatter.object({ mapa, id }));
  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(map.wkb_geometry, 6) AS geojson FROM ${mapa} map WHERE map.id = ${id}
    `
  );

  if (rowCount === 0) return null;

  L.debug('Dados queimadas prontos, retornando...');

  return JSON.parse(rows[0].geojson);
}

export default { mapas, entFederais: entidadesComDados };
