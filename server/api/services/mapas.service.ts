import L from '../../common/logger';
import knex from '../../common/knex';
import formatter from '../../common/utils/formatter';
import { formatSource, latestSource } from './queimadas.service';

type HandlerOpts = { municipio?: number; estado?: number; bioma?: string } & (
  | { municipio: number }
  | { estado: number }
  | { bioma: string }
);

export async function entidadesComDados(
  type: 'mapas_municipios' | 'mapas_estados' | 'mapas_biomas',
  opts: { source?: string; full?: boolean }
) {
  const joinMode = opts.full ? 'LEFT' : 'INNER';
  const typeDadosQueimadas = type.split('_')[1];
  const source = opts.source ? formatSource(opts.source) : await latestSource();
  const { rowCount, rows } = await knex.raw(
    `
      select 
        distinct ma.id,
        ${type !== 'mapas_biomas' ? 'ma.nome, ma.sigla ' : 'ma.bioma'}
      from ${type} ma
      ${joinMode} join dados_queimadas_${typeDadosQueimadas} dq on dq.referencia_id = ma.ref_id
      where dq.ano = ${source.year} and dq.mes = ${source.month}
      ORDER BY ${type !== 'mapas_biomas' ? 'ma.sigla, ma.nome' : 'ma.bioma'}
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

export default { mapas, entFederais: entidadesComDados, formatSource };
