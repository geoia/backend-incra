// Função auxiliar para criação de tabela de histórico
import knex from '../server/common/knex';
import consola from 'consola';
import { Knex } from 'knex';

const TABLE_NAME = '_historico_';

async function createHistoricoTable() {
  consola.debug('Verificando existência da tabela de metadados...');
  const hasTable = await knex.schema.withSchema('public').hasTable(TABLE_NAME);

  if (hasTable) return;

  await knex.schema.withSchema('public').createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table.enum('type', ['queimadas']);
    table.string('dirname');
    table.string('shapefile');
    table.string('path');
    table.dateTime('created_at').defaultTo(knex.fn.now());
  });
}

interface LogType {
  type: 'queimadas';
  dirname: string;
  shapefile: string;
  path: string;
}

export default async function insert(opts: LogType, trx?: Knex.Transaction) {
  await createHistoricoTable();
  await (trx || knex).withSchema('public').insert(opts).into(TABLE_NAME);
}
