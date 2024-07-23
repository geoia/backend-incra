import { Request, Response } from 'express';
import {
  estadosComDados,
  estatisticasMunicipios,
  municipiosComDados,
} from '../../services/estatisticas.service';

async function getEstatisticasMunicipios(req: Request, res: Response) {
  const municipio: string = req.params.municipio.toString();
  const result = await estatisticasMunicipios(municipio);

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

async function findMunicipios(_: Request, res: Response) {
  const result = await municipiosComDados();
  return res.status(result ? 200 : 204).send(result);
}

async function findEstados(_: Request, res: Response) {
  const result = await estadosComDados();
  return res.status(result ? 200 : 204).send(result);
}

export default { getEstatisticasMunicipios, getEstatisticasQueimadas, findMunicipios, findEstados };
