import { Request, Response } from 'express';
import {
  estatisticasEstados,
  estadosComDados,
  estatisticasMunicipios,
  municipiosComDados,
} from '../../services/estatisticas.service';

async function getEstatisticasMunicipios(req: Request, res: Response) {
  const municipio: string = req.params.municipio.toString();
  const ano: string = req.params.ano?.toString();

  const result = await estatisticasMunicipios(municipio, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasEstados(req: Request, res: Response) {
  const estado: string = req.params.estado.toString();
  const ano: string = req.params.ano?.toString();

  const result = await estatisticasEstados(estado, ano);
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

export default {
  getEstatisticasMunicipios,
  findMunicipios,
  findEstados,
  getEstatisticasEstados,
};
