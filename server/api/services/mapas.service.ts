import L from '../../common/logger';
import knex from '../../common/knex';
import formatter from '../../common/utils/formatter';

type HandlerOpts = { municipio?: number; estado?: number; bioma?: string } & (
  | { municipio: number }
  | { estado: number }
  | { bioma: string }
);

export async function entidadesComDados(
  type: 'mapas_municipios' | 'mapas_estados' | 'mapas_biomas',
  opts: { source?: string; full?: boolean }
) {
  const tableQueimadas = `mapas_queimadas${opts.source ? `_${opts.source}` : ''}`;
  const joinMode = opts.full ? 'LEFT' : 'INNER';
  const { rowCount, rows } = await knex.raw(
    `
    WITH queimadas AS (SELECT ST_Union(ST_Simplify(mq.wkb_geometry, 0.1, TRUE)) AS wkb_geometry FROM ${tableQueimadas} mq)
    SELECT DISTINCT ma.id, ${
      type !== 'mapas_biomas' ? 'ma.nome, ma.sigla, ' : 'ma.bioma,'
    } (mq.wkb_geometry IS NOT NULL) as queimadas 
      FROM ${type} ma ${joinMode} JOIN queimadas mq ON ST_Intersects(ma.wkb_geometry, mq.wkb_geometry)
    `
  );

  if (rowCount === 0) return null;

  return rows;
}

// handler do nextjs
export async function mapas(opts: HandlerOpts) {
  const { municipio, estado, bioma } = opts;

  let mapa: string, id: number | string;

  if (municipio) [mapa, id] = ['mapas_municipios', municipio];
  else if (estado) [mapa, id] = ['mapas_estados', estado];
  else if (bioma) [mapa, id] = ['mapas_biomas', `'${bioma}'`];
  else throw new Error('Nenhum critério de busca foi fornecido');

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
