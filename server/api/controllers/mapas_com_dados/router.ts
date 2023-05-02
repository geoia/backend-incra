import { Router } from 'express';
import controller from './controller';

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .get('/municipios', cacheMiddleware('1 week'), controller.get)
  .get('/estados', cacheMiddleware('1 week'), controller.get);