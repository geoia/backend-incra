import { Application } from 'express';
import queimadasRouter from './api/controllers/queimadas/router';

export default function routes(app: Application): void {
  app.use('/api/v1/queimadas', queimadasRouter);
}
