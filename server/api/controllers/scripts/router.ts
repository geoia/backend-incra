import { Router } from 'express';
import controller from './controller';

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .post('/download-mapas', controller.downloadMapasController)
  .post('/populate-municipios', controller.populateMunicipiosController)
  .post('/queimadas', controller.queimadasExecController)
  .get('/queimadas/prefixes', controller.queimadasGetPrefixesController)
  .delete('/queimadas/prefixes', controller.queimadasDeleteController)
  .post('/queimadas/cron', controller.queimadasCronExecController);
