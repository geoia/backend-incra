import { Router } from 'express';
import controller from './controller';

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .post('/download-mapas', controller.downloadMapasController)
  .post('/populate-municipios', controller.populateMunicipiosController);
