import { Request, Response } from 'express';
import { estatisticas, entidadesComDados } from '../../services/estatisticas.service';

async function getEstatisticasMunicipios(req: Request, res: Response) {
  const municipio: string = req.params.municipio.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticas('municipios', municipio, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasEstados(req: Request, res: Response) {
  const estado: string = req.params.estado.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticas('estados', estado, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function getEstatisticasBiomas(req: Request, res: Response) {
  const bioma: string = req.params.bioma.toString();
  const ano: string | undefined = req.query.year?.toString();

  const result = await estatisticas('biomas', bioma, ano);
  return res.status(result ? 200 : 204).send(result);
}

async function findMunicipios(_: Request, res: Response) {
  const result = await entidadesComDados('municipios');
  return res.status(result ? 200 : 204).send(result);
}

async function findBiomas(_: Request, res: Response) {
  const result = await entidadesComDados('biomas');
  return res.status(result ? 200 : 204).send(result);
}

async function findEstados(_: Request, res: Response) {
  const result = await entidadesComDados('estados');
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
