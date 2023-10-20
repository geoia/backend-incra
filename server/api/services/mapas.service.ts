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

export async function entidadesComDados(type: 'mapas_municipios' | 'mapas_estados') {
  const { rowCount, rows } = await knex.raw(
    `
    WITH queimadas AS (SELECT ST_Union(ST_Simplify(mq.wkb_geometry, 0.1, TRUE)) AS wkb_geometry FROM mapas_queimadas mq)
    SELECT DISTINCT ma.id, ma.nome, ma.sigla, (mq.wkb_geometry is not null) as queimadas FROM ${type} ma LEFT JOIN queimadas mq ON ST_Intersects(ST_Transform(ma.wkb_geometry, 4326), ST_Transform(mq.wkb_geometry, 4326))
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
    SELECT ST_AsGeoJSON(ST_Transform(map.wkb_geometry, 4326), 6) AS geojson FROM ${mapa} map WHERE map.id = ${id}
    `
  );

  if (rowCount === 0) return null;

  L.debug('Dados queimadas prontos, retornando...');

  return JSON.parse(rows[0].geojson);
}

export default { mapas, entFederais: entidadesComDados };
