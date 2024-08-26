import { Request, Response } from 'express';
import {
  estatisticasEstados,
  estadosComDados,
  estatisticasMunicipios,
  municipiosComDados,
  biomasComDados,
  estatisticasBiomas,
} from '../../services/estatisticas.service';

async function getEstatisticasMunicipios(req: Request, res: Response) {
  const municipio: string = req.params.municipio.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticasMunicipios(municipio, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasEstados(req: Request, res: Response) {
  const estado: string = req.params.estado.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticasEstados(estado, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasBiomas(req: Request, res: Response) {
  const bioma: string = req.params.bioma.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticasBiomas(bioma, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function findMunicipios(_: Request, res: Response) {
  const result = await municipiosComDados();
  return res.status(result ? 200 : 204).send(result);
}

async function findBiomas(_: Request, res: Response) {
  const result = await biomasComDados();
  return res.status(result ? 200 : 204).send(result);
}

async function findEstados(_: Request, res: Response) {
  const result = await estadosComDados();
  return res.status(result ? 200 : 204).send(result);
}

export default {
  getEstatisticasMunicipios,
  findMunicipios,
  findEstados,
  getEstatisticasEstados,
  findBiomas,
  getEstatisticasBiomas,
};
