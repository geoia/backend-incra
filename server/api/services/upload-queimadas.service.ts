import { resolve, extname } from 'node:path';
import extract from 'decompress';
import os from 'os';
import glob from 'glob';
import fs from 'fs';
import crypto from 'node:crypto';

interface FilesUUIDS {
  [key: string]: string;
}

// Função para calcular o checksum de um arquivo
function checksum(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1').setEncoding('hex');
    fs.createReadStream(file)
      .pipe(hash)
      .on('finish', () => resolve(hash.read()))
      .on('error', reject);
  });
}

// Remove os arquivos temporários
function remover_arquivos(tempDest: string, tempFilePath: string) {
  fs.rmSync(tempDest, { recursive: true });
  fs.rmSync(tempFilePath);
}

async function mover_arquivos(tempFilePath: string, tempDest: string) {
  const dest: string = resolve(__dirname, '..', '..', '..', 'shapefiles', 'queimadas');

  await extract(tempFilePath, tempDest, {
    filter: (file) => ['.shx', '.shp', '.qmd', '.prj', '.dbf', '.cpg'].includes(extname(file.path)),
  });

  // le todos os diretorios em queimadas
  const localDirs = glob.sync('*', { cwd: tempDest });
  const regex = /^(\d{4})(\d{2})(_.*){0,1}$/i;

  let flagFileNameError = false;

  for (const dirname of localDirs) {
    if (!regex.test(dirname)) {
      flagFileNameError = true;
      break;
    }

    const shapefiles = glob.sync('*.shp', { cwd: resolve(tempDest, dirname) });

    const checksums = await Promise.all(
      shapefiles.map((fileName) => checksum(resolve(tempDest, dirname, fileName)))
    );

    const filesUUIDS: FilesUUIDS = checksums.reduce((acc, checksum, index) => {
      const name = shapefiles[index].split('.')[0];
      return { ...acc, [name]: checksum };
    }, {});

    const files = glob.sync('*', { cwd: resolve(tempDest, dirname) });

    files.forEach((fileName) => {
      const [name, ext] = fileName.split('.');

      // TODO - remove arquivos que não possuem .shp associado, verificar se é realmente necessário
      if (!filesUUIDS[name]) {
        fs.rmSync(resolve(tempDest, dirname, fileName));
        return;
      }

      fs.renameSync(
        resolve(tempDest, dirname, fileName),
        resolve(tempDest, dirname, filesUUIDS[name] + '.' + ext)
      );
    });
  }

  if (flagFileNameError) {
    remover_arquivos(tempDest, tempFilePath);
    return false;
  } else {
    fs.cpSync(tempDest, dest, { recursive: true });
    remover_arquivos(tempDest, tempFilePath);
    return true;
  }
}

export async function saveContent(tempFilePath: string) {
  const tempDest: string = resolve(os.tmpdir(), 'extracted_' + tempFilePath.split('/').pop());

  if (!(await mover_arquivos(tempFilePath, tempDest))) {
    throw new Error('Diretório não segue o padrão de nome definido');
  }
}

export default { saveContent };
