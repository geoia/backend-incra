import { Router } from 'express';
import controller from './controller';
import multer from 'multer';
import os from 'os';

const upload = multer({ dest: os.tmpdir() });

export default Router()
  .post('/download-mapas', controller.downloadMapasController)
  .post('/populate-municipios', controller.populateMunicipiosController)
  .post('/queimadas', controller.queimadasExecController)
  .delete('/queimadas', controller.queimadasDeleteController)
  .post('/queimadas/upload', upload.single('zipfile'), controller.upload);
