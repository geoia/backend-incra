import { Router } from 'express';
import controller from './controller';

export default Router()
  .post('/download-mapas', controller.downloadMapasController)
  .post('/populate-municipios', controller.populateMunicipiosController)
  .post('/queimadas', controller.queimadasExecController)
  .delete('/queimadas', controller.queimadasDeleteController);
