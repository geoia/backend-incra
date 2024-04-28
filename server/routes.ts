import { Router } from 'express';
import queimadasRouter from './api/controllers/queimadas/router';
import mapasRouter from './api/controllers/mapas/router';
import scriptsRouter from './api/controllers/scripts/router';

export default function routes(): Router {
  const app = Router();

  app.use('/queimadas', queimadasRouter);
  app.use('/mapas', mapasRouter);
  app.use('/scripts', scriptsRouter);

  return app;
}
