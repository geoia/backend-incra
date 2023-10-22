import knex from '../server/common/knex';
import glob from 'glob';
import { join, resolve } from 'path';
import { each, mapSeries } from 'bluebird';
import consola from 'consola';
import dayjs from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Knex } from 'knex';
import ogr2ogr from './ogr2ogr';
import { CronJob } from 'cron';
import { Command, Option, program } from 'commander';
import MultiSelect from 'enquirer/lib/prompts/multiselect';
import { normalizeSRID } from './utils/normalize';

dayjs.extend(utcPlugin);
dayjs.extend(relativeTime);

type ShapefileData = {
  dirname: string;
  shapefiles: string[];
  prefix: string;
  name: string;
};

/***
 * Função que tem por objetivo atualizar a tabela de resumo dos dados no banco
 */
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

/***
 * Função para identificar shapefiles disponíveis
 */
function filesList(): ShapefileData[] {
  const shapefilesDir = resolve(__dirname, '..', 'shapefiles', 'queimadas');

  // le todos os diretorios em queimadas
  const localDirs = glob.sync('*', { cwd: shapefilesDir });
  const regex = /^(\d{4})(\d{2})(_.*){0,1}$/i;

  const data = localDirs
    .map((dirname) => {
      // verifica se o diretório segue o padrão de nome definido
      if (!regex.test(dirname)) return;

      //verificar se existem um arquivo .shp no diretório
      const shapefiles = glob.sync('*.shp', {
        cwd: resolve(shapefilesDir, dirname),
      });

      if (shapefiles.length === 0) return;

      // retorna dados preparados

      const [, year, month, name] = dirname.match(regex) || [];

      return { dirname, shapefiles, prefix: `${year}${month}`, name: (name || '').slice(1).trim() };
    })
    .filter((data) => data !== undefined) as ShapefileData[];

  return data.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/***
 * Função principal que:
 * - Obtém a lista de arquivos disponíveis na pasta de shapefiles/queimadas
 * - Processa e armazena cada registro encontrado
 * - Atualiza a visão mais recente para o registro mais recente
 */
export async function exec() {
  // obtem lista de shapefiles disponíveis
  const shapefiles = filesList().map((data) =>
    Object.assign(
      { table: `mapas_queimadas_${data.prefix}`, tmpTable: `shapefiles_queimadas_${data.prefix}` },
      data
    )
  );

  // processa shapefiles armazenados no diretório
  await each(shapefiles, async (data) => {
    consola.info(`Iniciando processamento de ${data.dirname}...`);

    consola.info('Verificando existência de dados antigos...');
    const hasTable = await knex.schema.withSchema('shapefiles').hasTable(data.tmpTable);

    if (!hasTable) {
      consola.info('Processando shapefile...');
      const opts = { table: data.tmpTable, overwrite: false };
      for (const shapefile of data.shapefiles)
        await ogr2ogr(join('queimadas', join(data.dirname, shapefile)), opts);
    }

    consola.info('Verificando existência de dados antigos em "public"...');
    const hasPublicTable = await knex.schema.withSchema('public').hasTable(data.table);

    if (!hasPublicTable) {
      consola.info('Copiando dados do mapa para shema public...');
      await knex.transaction(async (trx) => {
        await trx.schema
          .withSchema('public')
          .raw(`CREATE TABLE ${data.table} AS TABLE shapefiles."${data.tmpTable}"`);

        await trx.schema.withSchema('public').raw(
          `UPDATE ${data.table}
           SET wkb_geometry = ST_SetSRID(wkb_geometry, ${process.env.DEFAULT_EPSG || '3857'}) 
           WHERE ST_SRID(wkb_geometry) = 0;`
        );

        await normalizeSRID(`public.${data.table}`, 'wkb_geometry', { transaction: trx });

        await trx.schema
          .withSchema('public')
          .raw(`CREATE INDEX IF NOT EXISTS geom_idx ON ${data.table} USING gist (wkb_geometry)`);

        await updateHistory(data, trx);
      });
    }

    consola.info(`Arquivo ${data.dirname} finalizado.`);
  });

  await knex.transaction(async (trx) => {
    await trx.schema.withSchema('public').dropViewIfExists('mapas_queimadas');
    await trx.schema
      .withSchema('public')
      .createView('mapas_queimadas', (view) => view.as(knex.from(shapefiles.at(-1)?.table || '')));
  });

  consola.success('Processo finalizado com sucesso!');
}

/***
 * Função que permite agendar a execução do processamento usando cron
 */
export function cronExec(cronTime: string) {
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const job = new CronJob(cronTime, exec, null, true, timeZone);

  const logNextDate = () => {
    const nextDate = job.nextDate().toJSDate();
    const dateStr = nextDate.toISOString();
    const fromNow = dayjs(nextDate).fromNow();
    consola.log(`\n=== Proxima atualização ${dateStr} (${fromNow}) ===\n`);
  };

  job.fireOnTick = () => exec().then(logNextDate);
  job.fireOnTick();

  return job;
}

/***
 * Função que permite apagar registros de dados do banco.
 * Essa função é necessária porque várias tabelas e registros são gerados no processo.
 * Essa função apaga tudo de forma segura para manter a consistência do banco
 */
export async function execDelete(prefixes: string[], trx?: Knex.Transaction) {
  const conn = trx || (await knex.transaction());

  consola.info(`Preparing to remove tables with prefixes: ${prefixes.join(', ')}`);
  await mapSeries(prefixes, async (prefix) => {
    consola.debug(`Removing tables and metadata from ${prefix} ...`);
    return Promise.all([
      conn.delete().from('public.mapas_queimadas_historico').where({ prefix: prefix }),
      conn.raw(`DROP TABLE public.mapas_queimadas_${prefix} CASCADE`),
      conn.raw(`DROP TABLE shapefiles.shapefiles_queimadas_${prefix} CASCADE`),
    ]);
  })
    .then(async () => {
      consola.debug(`Setting up views from current data ...`);
      const result = await conn
        .from('public.mapas_queimadas_historico')
        .select('prefix')
        .orderBy('prefix', 'desc')
        .first<{ prefix: string }>();

      await conn.schema.withSchema('public').dropViewIfExists('mapas_queimadas');

      if (result) {
        await conn.schema
          .withSchema('public')
          .createView('mapas_queimadas', (view) =>
            view.as(knex.from(`mapas_queimadas_${result.prefix}`))
          );
      }

      consola.success('Data successfully removed');
      if (!trx) conn.commit();
    })
    .catch((error) => {
      if (!trx) conn.rollback();
      consola.error(error);
      throw error;
    });
}

if (require.main === module) {
  program
    .addCommand(
      new Command('exec')
        .addOption(
          new Option('--cron [value]', 'The time to fire off the update in the cron syntax')
        )
        .action(async (opts: { cron?: string }) => {
          if (opts.cron) cronExec(opts.cron);
          else await exec().then(() => knex.destroy());
        }),
      { isDefault: true }
    )
    .addCommand(
      new Command('delete').action(async () => {
        const prefixes: Array<{ prefix: string }> = await knex
          .select('prefix')
          .from('public.mapas_queimadas_historico');

        const prompt = new MultiSelect({
          message: 'Select prefixes to remove',
          limit: 5,
          choices: prefixes.map(({ prefix }) => prefix),
        });

        return execDelete(await prompt.run()).then(() => knex.destroy());
      })
    )
    .parseAsync(process.argv);
}
