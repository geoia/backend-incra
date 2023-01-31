import knex from '../server/common/knex';
import glob from 'glob';
import { join, resolve } from 'path';
import { each } from 'bluebird';
import consola from 'consola';
import dayjs from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';
import { Knex } from 'knex';
import ogr2ogr from './ogr2ogr';

dayjs.extend(utcPlugin);

const SHAPEFILES_DIR = resolve(__dirname, '..', 'shapefiles', 'queimadas');

type ShapefileData = {
  dirname: string;
  shapefile: string;
  path: string;
  prefix: string;
  name: string;
};

async function updateHistory({ prefix, dirname }: ShapefileData, trx?: Knex.Transaction) {
  const conn = trx || knex;

  consola.debug('Verificando existência da tabela de metadados...');
  const hasTable = await conn.schema.withSchema('public').hasTable('mapas_queimadas_historico');

  if (!hasTable) {
    await conn.schema.withSchema('public').createTable('mapas_queimadas_historico', (table) => {
      table.string('prefix').checkRegex('[0-9]{6}').primary();
      table.integer('year').unsigned();
      table.integer('month').unsigned();
      table.string('dirname');
      table.dateTime('created_at').defaultTo(conn.fn.now());
    });
  }

  return conn
    .withSchema('public')
    .insert({
      prefix,
      year: parseInt(prefix.slice(0, 4)),
      month: parseInt(prefix.slice(4, 6)),
      dirname,
    })
    .into('mapas_queimadas_historico');
}

// Função para identificar shapefiles disponíveis
function filesList(): ShapefileData[] {
  // le todos os diretorios em queimadas
  const localDirs = glob.sync('*', { cwd: SHAPEFILES_DIR });
  const regex = /^(\d{4})(\d{2})_(.+)$/i;

  const data = localDirs
    .map((dirname) => {
      // verifica se o diretório segue o padrão de nome definido
      if (!regex.test(dirname)) return;

      //verificar se existem um arquivo .shp no diretório
      const [shapefile] = glob.sync('*.shp', {
        cwd: resolve(SHAPEFILES_DIR, dirname),
      });
      if (!shapefile) return;

      // retorna dados preparados

      const [, year, month, name] = dirname.match(regex) || [];
      console.log(year, month, name, dirname.match(regex));
      return {
        dirname,
        shapefile,
        path: join(dirname, shapefile),
        prefix: `${year}${month}`,
        name: name.trim(),
      };
    })
    .filter((data) => data !== undefined) as ShapefileData[];

  return data.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

async function main() {
  // obtem lista de shapefiles disponíveis
  const shapefiles = filesList().map((data) =>
    Object.assign({ table: `mapas_queimadas_${data.prefix}` }, data)
  );

  // processa shapefiles armazenados no diretório
  await each(shapefiles, async (data) => {
    consola.info(`Iniciando processamento de ${data.dirname}...`);

    consola.info('Verificando existência de dados antigos...');
    const hasTable = await knex.schema.withSchema('shapefiles').hasTable(data.dirname);

    if (!hasTable) {
      consola.info('Processando shapefile...');
      ogr2ogr(join('queimadas', data.path), data.dirname);
    }

    consola.info('Verificando existência de dados antigos em "public"...');
    const hasPublicTable = await knex.schema.withSchema('public').hasTable(data.table);

    if (!hasPublicTable) {
      consola.info('Copiando dados do mapa para shema public...');
      await knex.transaction(async (trx) => {
        await trx.schema
          .withSchema('public')
          .raw(`CREATE TABLE ${data.table} AS TABLE shapefiles."${data.dirname}"`);

        await trx.schema
          .withSchema('public')
          .raw(`CREATE INDEX IF NOT EXISTS geom_idx ON ${data.table} USING gist (wkb_geometry)`);

        await updateHistory(data, trx);
      });
    }

    consola.info(`Arquivo ${data.dirname} finalizado.`);
  });

  await knex.schema
    .withSchema('public')
    .createViewOrReplace('mapas_queimadas', (view) =>
      view.as(knex.from(shapefiles.at(-1)?.table || ''))
    );

  consola.success('Processo finalizado com sucesso!');
}

if (require.main === module) main().then(() => knex.destroy());
