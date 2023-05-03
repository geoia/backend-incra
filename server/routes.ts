import { Application } from 'express';
import queimadasRouter from './api/controllers/queimadas/router';
import mapasRouter from './api/controllers/mapas/router';
import mapasComDadosRouter from './api/controllers/mapas_com_dados/router';

export default function routes(app: Application): void {
  app.use('/api/v1/queimadas', queimadasRouter);
  app.use('/api/v1/mapas', mapasRouter);
  app.use('/api/v1/mapas_com_dados', mapasComDadosRouter);
}
