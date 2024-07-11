import { Request, Response } from 'express';
import { estatisticas } from '../../services/estatisticas.service';

async function getEstatisticas(_: Request, res: Response) {
  const result = await estatisticas();

  return res.status(result ? 200 : 204).send(result);
}

export default { getEstatisticas };
