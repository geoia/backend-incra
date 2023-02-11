import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import knex from '../server/common/knex';

async function local(path: string, table?: string) {
  const mapasDir = resolve(__dirname, '..', 'shapefiles');
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;

  const filePath = resolve(mapasDir, path);
  const connStr = `PG:"host=${PG_HOST} port=${PG_PORT} user=${PG_USER} password=${PG_PASSWORD} dbname=${PG_DATABASE} active_schema=shapefiles"`;
  const tableCmd = table ? `-nln "${table}"` : '';

  await knex.schema.createSchemaIfNotExists('shapefiles');

  const p = exec(
    `ogr2ogr -progress -preserve_fid -overwrite -nlt POLYGON ${tableCmd} -f PostgreSQL ${connStr} "${filePath}"`
  );

  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);

  return new Promise<void>((resolve) => p.on('close', resolve));
}

async function docker(path: string, table?: string) {
  await knex.schema.createSchemaIfNotExists('shapefiles');

  const command = 'docker compose run --rm gdal sh ogr2ogr';
  const p = exec(`${command} "${path}" ${table || ''}`);

  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);

  return new Promise<void>((resolve) => p.on('close', resolve));
}

export default process.env.GDAL === 'local' ? local : docker;
