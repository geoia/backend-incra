import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

function local(path: string, table?: string) {
  const mapasDir = resolve(__dirname, '..', 'shapefiles');
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;

  const filePath = resolve(mapasDir, path);
  const connStr = `PG:"host=${PG_HOST} port=${PG_PORT} user=${PG_USER} password=${PG_PASSWORD} dbname=${PG_DATABASE} active_schema=shapefiles"`;
  const tableCmd = table ? `-nln "${table}"` : '';

  execSync(
    `ogr2ogr -progress -preserve_fid -overwrite -nlt POLYGON ${tableCmd} -f PostgreSQL ${connStr} "${filePath}"`,
    { stdio: 'inherit' }
  );
}

function docker(path: string, table?: string) {
  const command = 'docker compose run --rm gdal sh ogr2ogr';
  const tableCmd = table ? `-nln "${table}"` : '';
  execSync(`${command} "${path}" ${tableCmd}`, { stdio: 'inherit' });
}

export default process.env.GDAL === 'local' ? local : docker;
