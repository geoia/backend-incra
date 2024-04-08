import { resolve, extname } from 'node:path';
import extract from 'decompress';

export function saveContent(tempFilePath: string) {
  const dest: string = resolve(__dirname, '..', '..', '..', 'shapefiles', 'queimadas');
  return extract(tempFilePath, dest, {
    filter: (file) => ['.shx', '.shp', '.qmd', '.prj', '.dbf', '.cpg'].includes(extname(file.path)),
  });
}

export default { saveContent };
