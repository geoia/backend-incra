import L from '../../common/logger';
import knex from '../../common/knex';
import type { Polygon, Feature, MultiPolygon } from '@turf/turf';
import { simplify as simplifyFn, polygon } from '@turf/turf';
import { isNil, negate } from 'lodash';
import { union } from '../../common/utils/polygons';
import formatter from '../../common/utils/formatter';

const isNotNil = negate(isNil);

type BaseHandlerOpts = { simplify?: boolean; page?: number };
type HandlerOpts = BaseHandlerOpts & {
  municipio?: number;
  estado?: number;
} & ({ municipio: number } | { estado: number });

// handler do nextjs
async function get(opts: HandlerOpts): Promise<Feature<Polygon | MultiPolygon> | null> {
  const { municipio, estado, simplify, page } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  const limit = 1000;
  const offset = Math.max(parseInt((page || '1').toString()), 1) * 1000;

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id, simplify, page })
  );
  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_Transform(sm.geom, 4326), 6) AS GeoJSON
    FROM (
      SELECT m.wkb_geometry AS geom FROM mapas_queimadas m
      WHERE ST_Within(
        ST_Transform(m.wkb_geometry, 4326),
        (SELECT ST_Transform(map.wkb_geometry, 4326) FROM ${mapa} map WHERE map.id = ${id})
      )
      LIMIT ${limit}
      OFFSET ${offset}
    ) sm;
    `
  );

  if (rows.length === 0) return null;

  L.debug('Agrupando (%s) poligonos em um único geojson...', rowCount);
  let multiPolygons = union(rows.map((row: any) => polygon(JSON.parse(row.geojson).coordinates)));

  if (simplify) {
    L.debug('Simplificando poligonos...');
    multiPolygons = simplifyFn(multiPolygons, {
      tolerance: 1,
      highQuality: true,
    });
  }

  L.debug('Dados queimadas prontos, retornando...');
  return multiPolygons;
}

export default {
  municipio: (opts: BaseHandlerOpts & { municipio: number }) => get(opts),
  estado: (opts: BaseHandlerOpts & { estado: number }) => get(opts),
};
