import { Router } from 'express';
import controller from './controller';

export default Router()
  .get('/municipio/:municipio', controller.municipio)
  .get('/estado/:estado', controller.estado);
