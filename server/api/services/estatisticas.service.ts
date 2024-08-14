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

export async function municipiosComDados() {
  const query = await knex.raw(`
    select 
      distinct est.referencia_id as id, 
      dm.nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.nome 
  `);
  return query.rows;
}

export async function estadosComDados() {
  const query = await knex.raw(`
    select 
      distinct dm.uf_id as id, 
      dm.uf_nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.uf_nome  
  `);
  return query.rows;
}

export async function estatisticasEstados(
  estado: string,
  ano?: string
): Promise<Array<estatistica_ano>> {
  const anos = await knex.raw(`
      select 
          est.ano,
          SUM(total_area_queimada) as area_queimada,
          SUM(total_focos_queimada) as focos,
          (SUM(total_area_queimada)/
          (select ST_AREA(ST_MAKEVALID(me.wkb_geometry), true) from mapas_estados me where me.id = ${estado})) * 100 as percentual
      from estatisticas_queimadas_municipios est
      join dados_municipios dm on dm.id = est.referencia_id 
      where 
        dm.uf_id = ${estado}
        ${ano ? `and ano = ${ano}` : ''} 
      group by ano
      order by ano
    `);

  return await Promise.all(
    anos.rows.map(async (row: estatistica_ano) => {
      const query_meses = await knex.raw(`
        select 
          est.mes,
          SUM(total_area_queimada) as area_queimada,
          SUM(total_focos_queimada) as focos,
          (SUM(total_area_queimada)/
          (select ST_AREA(ST_MAKEVALID(me.wkb_geometry), true) from mapas_estados me where me.id = ${estado})) * 100 as percentual
        from estatisticas_queimadas_municipios est
        join dados_municipios dm on dm.id = est.referencia_id 
        where 
          dm.uf_id = ${estado} 
          and est.ano = ${row.ano} 
        group by mes
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

export async function estatisticasMunicipios(
  municipio: string,
  ano?: string
): Promise<Array<estatistica_ano>> {
  const anos = await knex.raw(`
      select 
          est.ano,
          SUM(total_area_queimada) as area_queimada,
          SUM(total_focos_queimada) as focos,
          ((SUM(total_area_queimada)/1e6)/
          (select mm.area_km2 from mapas_municipios mm where mm.id = ${municipio})) * 100 as percentual
      from estatisticas_queimadas_municipios est
      where 
        est.referencia_id = ${municipio}
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
        ((est.total_area_queimada/1e6)/mm.area_km2) * 100 as percentual
      from estatisticas_queimadas_municipios est
      join mapas_municipios mm on mm.id = est.referencia_id
      where 
        est.referencia_id = ${municipio} 
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
  municipiosComDados,
  estadosComDados,
  estatisticasMunicipios,
  estatisticasEstados,
};
