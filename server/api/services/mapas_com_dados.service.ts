import knex from '../../common/knex';

export async function entFederais(opts: string) {
  const { rowCount, rows } = await knex.raw(
    `
    WITH queimadas AS (SELECT ST_Union(ST_Simplify(mq.wkb_geometry, 0.1, TRUE)) AS wkb_geometry FROM mapas_queimadas mq)
    SELECT DISTINCT ma.id, ma.nome FROM ${opts} ma JOIN queimadas mq ON ST_Intersects(ST_Transform(ma.wkb_geometry, 4326), mq.wkb_geometry)
    `
  );
  if (rowCount === 0) return null;

  return JSON.stringify(rows);
}

export default { entFederais };
