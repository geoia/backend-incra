import { Request, Response } from 'express';
import { downloadMapas } from '../../services/download-mapas.service';
import { populateMunicipios } from '../../services/populate-municipios.service';
import { exec, getPrefixes, execDelete } from '../../services/process-queimadas.service';
import { saveContent } from '../../services/upload-queimadas.service';

async function downloadMapasController(req: Request, res: Response) {
  const override: boolean = Boolean(req.query.override) || false;
  downloadMapas(override);
  return res.status(202).json({ message: 'script iniciado com sucesso!' });
}

async function populateMunicipiosController(req: Request, res: Response) {
  const override: boolean = Boolean(req.query.override) || false;
  populateMunicipios(override);
  return res.status(202).json({ message: 'script iniciado com sucesso!' });
}

async function queimadasExecController(_req: Request, res: Response) {
  exec();
  return res.status(202).json({ message: 'script iniciado com sucesso!' });
}

async function queimadasDeleteController(req: Request, res: Response) {
  const prefixes: Array<string> = await getPrefixes().then((resp) =>
    resp.map((prefixObj) => prefixObj.prefix)
  );

  const requestedPrefix: string = req.query.prefix ? req.query.prefix.toString() : '';

  if (requestedPrefix != '' && !prefixes.includes(requestedPrefix)) {
    return res.status(400).send({ message: 'Prefixo inválido!' });
  }

  await execDelete([requestedPrefix]);

  return res.status(200).send({ message: 'Deletado!' });
}

async function upload(req: Request, res: Response) {
  const file: Express.Multer.File | undefined = req.file;
  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
  }
  await saveContent(file.path).catch(() => {
    return res.status(500).json({ message: 'Erro ao descompactar arquivos.' });
  });
  return res.status(201).json({ message: 'Arquivo salvo.' });
}

export default {
  downloadMapasController,
  populateMunicipiosController,
  queimadasExecController,
  queimadasDeleteController,
  upload,
};
