import { Request, Response } from 'express';
import { estatisticas } from '../../services/estatisticas.service';

async function getEstatisticas(_: Request, res: Response) {
  const result = await estatisticas();

  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasQueimadas(_: Request, res: Response) {
  // const municipio = req.params.municipio ? parseInt(req.params.municipio) : undefined;
  // const estado = req.params.estado ? parseInt(req.params.estado) : undefined;
  // const bioma = req.params.bioma || undefined;
  //
  // const result = await estatisticasQueimadas();

  const result = 200;
  return res.status(result ? 200 : 204).send(result);
}

export default { getEstatisticas, getEstatisticasQueimadas };
