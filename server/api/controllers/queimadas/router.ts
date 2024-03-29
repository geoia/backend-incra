import { Router } from 'express';
import controller from './controller';
import multer from 'multer';
import os from 'os'

const upload = multer({ dest: os.tmpdir() });

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .get('/sources', cacheMiddleware('1 week'), controller.getSources)
  .get('/:source/municipios', cacheMiddleware('1 week'), controller.find)
  .get('/:source/municipios/:municipio', cacheMiddleware('1 week'), controller.get)
  .get('/:source/estados', cacheMiddleware('1 week'), controller.find)
  .get('/:source/estados/:estado', cacheMiddleware('1 week'), controller.get)
  .post('/upload', upload.single('zipfile'), controller.upload);
