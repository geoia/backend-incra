import { Router } from 'express';
import controller from './controller';

export default Router()
  .get('/municipios/', controller.findMunicipios)
  .get('/municipios/:municipio', controller.getEstatisticasMunicipios)
  .get('/estados/', controller.findEstados);
