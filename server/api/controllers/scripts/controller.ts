import { Request, Response } from 'express';
import { downloadMapas } from '../../services/download-mapas.service';
import { populateMunicipios } from '../../services/populate-municipios.service';


async function downloadMapasController(req: Request, res: Response) {
  const override: boolean = Boolean( req.query.override) || false
  downloadMapas(override);
  return res.status(201).json({message: 'script iniciado com sucesso!'});
}

async function populateMunicipiosController(req: Request, res: Response) {
  const override: boolean = Boolean( req.query.override) || false
  populateMunicipios(override);
  return res.status(201).json({message: 'script iniciado com sucesso!'});
}

export default { downloadMapasController, populateMunicipiosController };
