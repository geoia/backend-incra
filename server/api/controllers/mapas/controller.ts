import { Request, Response } from 'express';
import { mapas } from '../../services/mapas.service';

async function get(req: Request, res: Response) {
  const criteria = {
    municipio: req.params.municipio ? parseInt(req.params.municipio) : undefined,
    estado: req.params.estado ? parseInt(req.params.estado) : undefined,
    bioma: req.params.bioma,
  };

  const result = await mapas(criteria);

  return res.status(result ? 200 : 404).send(result);
}

export default { get };
