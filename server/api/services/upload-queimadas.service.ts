import { resolve, extname } from 'node:path';
import extract from 'decompress';
import os from 'os';
import glob from 'glob';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface FilesUUIDS {
  [key: string]: string;
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

    let filesUUIDS: FilesUUIDS = {};

    const files = glob.sync('*', { cwd: resolve(tempDest, dirname) });

    files.map((fileName) => {
      const name = fileName.split('.')[0];
      const ext = fileName.split('.')[1];

      if (!filesUUIDS[name]) {
        filesUUIDS = { ...filesUUIDS, [name]: uuidv4() };
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
