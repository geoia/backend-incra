import { createWriteStream, existsSync } from 'node:fs';
import https from 'node:https';
import { withFile } from 'tmp-promise';
import decompress from 'decompress';
import { basename, join, resolve } from 'node:path';
import consola from 'consola';
import crypto from 'crypto';

export async function downloadMapas(override: boolean): Promise<void> {
  consola.info('Baixando mapas ...');
  const mapas = resolve(__dirname, '../../../shapefiles/mapas');
  await Promise.all([
    download(
      'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2021/Brasil/BR/BR_Municipios_2021.zip',
      join(mapas, 'BR_Municipios_2021'),
      override
    ),
    download(
      'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2021/Brasil/BR/BR_UF_2021.zip',
      join(mapas, 'BR_UF_2021'),
      override
    ),
    download(
      'https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_250mil.zip',
      join(mapas, 'Biomas'),
      override
    ),
    download(
      'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2021/Brasil/BR/BR_Pais_2021.zip',
      join(mapas, 'BR_Pais_2021'),
      override
    ),
  ]);

  consola.success('Mapas baixados com sucesso!');
}

async function download(url: string, dest: string, override = false): Promise<void> {
  if (!override && existsSync(dest)) {
    consola.info('Files already downloaded (%s), skipping...', basename(dest));
    return;
  }

  consola.info('Downloading %s', url);
  consola.debug('Preparando arquivos temporários ...');
  return withFile(async ({ path }) => {
    consola.debug('Baixando arquivos ...');
    await new Promise<void>((resolve, reject) => {
      const fileStream = createWriteStream(path);
      https.get(
        url,
        {
          agent: new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT }),
        },
        (res) => res.pipe(fileStream)
      );
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    consola.debug('Descompactando arquivos ...');
    await decompress(path, dest);

    consola.success('Arquivos baixados e descompactados em %s com sucesso!', dest);
  });
}
