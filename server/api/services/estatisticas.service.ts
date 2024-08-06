import knex from '../../common/knex';

export async function municipiosComDados() {
  const query = await knex.raw(
    `select 
      distinct est.referencia_id as id, 
      dm.nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.nome 
  `
  );
  return query.rows;
}

export async function estadosComDados() {
  const query = await knex.raw(
    `select 
      distinct dm.uf_id as id, 
      dm.uf_nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.uf_nome  
  `
  );
  return query.rows;
}

export async function estatisticasEstados(estado: string, ano?: string) {
  if (ano) {
    const query_meses = await knex.raw(
      `
    select 
 	  est.mes,
      SUM(total_area_queimada) as area_queimada,
      SUM(total_focos_queimada) as focos,
      (SUM(total_area_queimada)/
      (select ST_AREA(me.wkb_geometry, true) from mapas_estados me where me.id = ${estado})) * 100 as percentual
  from estatisticas_queimadas_municipios est
  join dados_municipios dm on dm.id = est.referencia_id 
  where dm.uf_id = ${estado} and est.ano = ${ano} 
  group by mes
  order by mes
`
    );
    return query_meses.rows;
  } else {
    const anos = await knex.raw(
      `
select 
      est.ano,
      SUM(total_area_queimada) as area_queimada,
      SUM(total_focos_queimada) as focos,
      (SUM(total_area_queimada)/
      (select ST_AREA(me.wkb_geometry, true) from mapas_estados me where me.id = ${estado})) * 100 as percentual
  from estatisticas_queimadas_municipios est
  join dados_municipios dm on dm.id = est.referencia_id 
  where dm.uf_id = ${estado} 
  group by ano
  order by ano
`
    );

    const result: any = new Array<any>(anos.rows.length);

    for (let i = 0; i < anos.rows.length; i++) {
      const ano = anos.rows[i].ano;
      const query_meses = await knex.raw(
        `
    select 
 	  est.mes,
      SUM(total_area_queimada) as area_queimada,
      SUM(total_focos_queimada) as focos,
      (SUM(total_area_queimada)/
      (select ST_AREA(me.wkb_geometry, true) from mapas_estados me where me.id = ${estado})) * 100 as percentual
  from estatisticas_queimadas_municipios est
  join dados_municipios dm on dm.id = est.referencia_id 
  where dm.uf_id = ${estado} and est.ano = ${ano} 
  group by mes
  order by mes
`
      );
      result[i] = {
        ano: ano,
        area_queimada: anos.rows[i].area_queimada,
        focos: anos.rows[i].focos,
        percentual: anos.rows[i].percentual,
        meses: query_meses.rows,
      };
    }

    return result;
  }
}

export async function estatisticasMunicipios(municipio: string, ano?: string) {
  if (ano) {
    const query_meses = await knex.raw(
      `select 
      est.mes,
      est.total_area_queimada as area_queimada,
      est.total_focos_queimada as focos,
      ((est.total_area_queimada/1000000)/mm.area_km2) * 100 as percentual
    from estatisticas_queimadas_municipios est
    join mapas_municipios mm on mm.id = est.referencia_id
    where est.referencia_id = ${municipio} and ano = ${ano}
    order by mes  
  `
    );

    return query_meses.rows;
  } else {
    const anos = await knex.raw(
      `
      select 
          est.ano,
          SUM(total_area_queimada) as area_queimada,
          SUM(total_focos_queimada) as focos,
          ((SUM(total_area_queimada)/1000000)/
          (select mm.area_km2 from mapas_municipios mm where mm.id = ${municipio})) * 100 as percentual
      from estatisticas_queimadas_municipios est
      where est.referencia_id = ${municipio}
      group by ano
      order by ano  
    `
    );
    const result: any = new Array<any>(anos.rows.length);

    for (let index = 0; index < anos.rows.length; index++) {
      const ano = anos.rows[index].ano;
      const query_meses = await knex.raw(
        `select 
      est.mes,
      est.total_area_queimada as area_queimada,
      est.total_focos_queimada as focos,
      ((est.total_area_queimada/1000000)/mm.area_km2) * 100 as percentual
    from estatisticas_queimadas_municipios est
    join mapas_municipios mm on mm.id = est.referencia_id
    where est.referencia_id = ${municipio} and ano = ${ano}
    order by mes  
  `
      );
      result[index] = {
        ano: ano,
        area_queimada: anos.rows[index].area_queimada,
        focos: anos.rows[index].focos,
        percentual: anos.rows[index].percentual,
        meses: query_meses.rows,
      };
    }

    return result;
  }
}

export default {
  municipiosComDados,
  estadosComDados,
  estatisticasMunicipios,
  estatisticasEstados,
};
