import { Router } from 'express';
import controller from './controller';

export default Router()
  .get('/municipios/:municipio', controller.getEstatisticas)
  .get('/estados/:estado', controller.getEstatisticas)
  .get('/biomas/:bioma', controller.getEstatisticas);
