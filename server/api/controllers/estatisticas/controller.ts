import { Request, Response } from 'express';
import { estatisticas } from '../../services/estatisticas.service';
import { estatisticasQueimadas } from '../../services/queimadas.service';

async function getEstatisticas(_: Request, res: Response) {
  const result = await estatisticas();

  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasQueimadas(req: Request, res: Response) {
  const municipio = req.params.municipio ? parseInt(req.params.municipio) : undefined;
  const estado = req.params.estado ? parseInt(req.params.estado) : undefined;
  const bioma = req.params.bioma || undefined;

  const criteria = { municipio, estado, bioma } as Parameters<typeof estatisticasQueimadas>[0];

  const result = await estatisticasQueimadas(criteria);

  return res.status(result ? 200 : 204).send(result);
}

export default { getEstatisticas, getEstatisticasQueimadas };
