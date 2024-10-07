import knex from '../../common/knex';

interface estatistica_mes {
  mes: number;
  area_queimada: number;
  focos: number | string;
  percentual: number;
}

interface estatistica_ano {
  ano: number;
  area_queimada: number;
  focos: number | string;
  percentual: number;
  meses: Array<estatistica_mes>;
}

export async function entidadesComDados(mapa: string) {
  const query = await knex.raw(`
    select 
      distinct est.referencia_id as id 
      ,dm.nome as nome 
      ${mapa == 'estados' || mapa == 'municipios' ? ',dm.sigla as sigla' : ''}  
    from estatisticas_queimadas_${mapa} est
    join mapas_${mapa} dm on dm.ref_id = est.referencia_id 
    order by dm.nome 
  `);
  return query.rows;
}

export async function estatisticas(
  mapa: string,
  referencia: string,
  ano?: string
): Promise<Array<estatistica_ano>> {
  const anos = await knex.raw(`
      select 
          est.ano,
          SUM(total_area_queimada) as area_queimada,
          SUM(total_focos_queimada) as focos,
          ((SUM(total_area_queimada))/
          (select map.area_m2 from mapas_${mapa} map where map.ref_id = ${referencia})) * 100 as percentual
      from estatisticas_queimadas_${mapa} est
      where 
        est.referencia_id = ${referencia}
        ${ano ? `and ano = ${ano}` : ''} 
      group by ano
      order by ano  
  `);

  return await Promise.all(
    anos.rows.map(async (row: estatistica_ano) => {
      const query_meses = await knex.raw(`
      select 
        est.mes,
        est.total_area_queimada as area_queimada,
        est.total_focos_queimada as focos,
        ((est.total_area_queimada)/map.area_m2) * 100 as percentual
      from estatisticas_queimadas_${mapa} est
      join mapas_${mapa} map on map.ref_id = est.referencia_id
      where 
        est.referencia_id = ${referencia} 
        and ano = ${row.ano}
      order by mes  
  `);
      return {
        ano: row.ano,
        area_queimada: row.area_queimada,
        focos: row.focos,
        percentual: row.percentual,
        meses: query_meses.rows,
      };
    })
  );
}

export default {
  entidadesComDados,
  estatisticas,
};
