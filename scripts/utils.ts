import { Knex } from 'knex';

import knex from '../server/common/knex';

/***
 * Função para normalização de referências espaciais.
 * Essa função é importante para otimizar consultas
 */
export async function normalizeSRID(
  table: string,
  column: string,
  opts?: { reference?: number; transaction?: Knex.Transaction }
) {
  const conn = opts?.transaction || knex;

  await conn.raw(`
    UPDATE ${table} SET ${column} = ST_Transform(${column}, ${opts?.reference || 4326})
  `);
}

/***
 *
 */
export async function makeValid(
  table: string,
  column: string,
  opts?: { transaction?: Knex.Transaction }
) {
  const conn = opts?.transaction || knex;

  await conn.raw(`
    UPDATE ${table} SET ${column} = ST_MakeValid(${column}, 'method=structure') WHERE not ST_IsValid(${column})
  `);
}
