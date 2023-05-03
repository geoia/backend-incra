import { Request, Response } from 'express';
import { entFederais } from '../../services/mapas_com_dados.service';

async function get(req: Request, res: Response) {
  const criteria = req.url.includes('municipios') ? 'mapas_municipios' : 'mapas_estados';

  const result = await entFederais(criteria);

  return res.status(result ? 200 : 204).send(result);
}

export default { get };
