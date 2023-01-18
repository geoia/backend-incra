import knex from '../server/common/knex';
import glob from 'glob';
import { resolve, sep } from 'path';
import { execSync } from 'child_process';
import { mapSeries } from 'bluebird';
import consola from 'consola';
import dayjs from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';
import { orderBy } from 'lodash';
import logScript from './logs';

dayjs.extend(utcPlugin);

const SHAPEFILES_DIR = resolve(__dirname, '..', 'shapefiles', 'queimadas');

type ShapefileData = {
  dirname: string;
  shapefile: string;
  path: string;
  date: Date;
  name: string;
};

// Função para identificar shapefiles disponíveis
function filesList(): ShapefileData[] {
  // le todos os diretorios em queimadas
  const localDirs = glob.sync('*', { cwd: SHAPEFILES_DIR });

  return localDirs
    .map((dirname) => {
      // verifica se o diretório segue o padrão de nome definido
      if (!/^\d{8}_.+$/g.test(dirname)) return;

      //verificar se existem um arquivo .shp no diretório
      const [shapefile] = glob.sync('*.shp', {
        cwd: resolve(SHAPEFILES_DIR, dirname),
      });
      if (!shapefile) return;

      // retorna dados preparados
      const [, year, month, day, name] = /^(\d{4})(\d{2})(\d{2})_(.+)$/g.exec(dirname) || [];
      return {
        dirname,
        shapefile,
        path: `${dirname}${sep}${shapefile}`,
        date: new Date(`${year}-${month}-${day}T00:00:00Z`),
        name: name.trim(),
      };
    })
    .filter((data) => data !== undefined) as ShapefileData[];
}

// Função que processa o shapefile
async function processShapefile(path: string, tableDestination?: string) {
  execSync(`docker compose run --rm gdal ./ogr2ogr queimadas/${path} ${tableDestination || ''}`, {
    stdio: 'inherit',
  });
}

async function main() {
  // obtem lista de shapefiles disponíveis
  const shapefiles = orderBy(filesList(), ['date'], ['asc']).map((data) => ({
    ...data,
    table: `mapas_queimadas_${dayjs.utc(data.date).format('YYYYMMDD')}`,
  }));

  // processa shapefiles armazenados no diretório
  await mapSeries(shapefiles, async (data) => {
    consola.info(`Iniciando processamento de ${data.dirname}...`);

    consola.info('Verificando existência de dados antigos...');
    const hasTable = await knex.schema.withSchema('shapefiles').hasTable(data.dirname);

    if (!hasTable) {
      consola.info('Processando shapefile...');
      await processShapefile(data.path, data.dirname);
    }

    consola.info('Verificando existência de dados antigos em "public"...');
    const hasPublicTable = await knex.schema.withSchema('public').hasTable(data.table);

    if (!hasPublicTable) {
      consola.info('Copiando dados do mapa para shema public...');
      await knex.transaction(async (trx) => {
        await trx.schema
          .withSchema('public')
          .raw(`CREATE TABLE ${data.table} AS TABLE shapefiles."${data.dirname}"`);

        await logScript(
          {
            type: 'queimadas',
            dirname: data.dirname,
            shapefile: data.shapefile,
            path: data.path,
          },
          trx
        );
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
