import L from '../../common/logger';
import knex from '../../common/knex';
import { Polygon, Feature, featureCollection, combine } from '@turf/turf';
import { simplify as simplifyFn, polygon } from '@turf/turf';
import { isNil, negate } from 'lodash';
// import { union } from '../../common/utils/polygons';
import formatter from '../../common/utils/formatter';

const isNotNil = negate(isNil);

type LocaleOpts = { municipio?: boolean; estado?: boolean } &
  (
    | { municipio: boolean }
    | { estado: boolean }
  );
type HandlerOpts = LocaleOpts;
// handler do nextjs

export async function entFederais(opts: string) {
  const { rowCount, rows } = await knex.raw(
    `
    WITH queimadas AS (SELECT ST_Union(ST_Simplify(mq.wkb_geometry, 0.1, TRUE)) AS wkb_geometry FROM mapas_queimadas mq)
    SELECT DISTINCT ma.nome FROM ${opts} ma JOIN queimadas mq ON ST_Intersects(ST_Transform(ma.wkb_geometry, 4326), mq.wkb_geometry)
    `
  );
  if (rowCount === 0) return null;

  return JSON.stringify(rows);
}

export async function mapas(opts: HandlerOpts) {
  const { municipio, estado } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id })
  );
  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_Transform(map.wkb_geometry, 4326), 6) AS geojson FROM ${mapa} map WHERE map.id = ${id}
    `
  );

  if (rowCount === 0) return null;

  L.debug('Dados queimadas prontos, retornando...');

  return JSON.parse(rows[0].geojson);
}

export default { mapas };
