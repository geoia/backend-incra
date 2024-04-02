import { Request, Response } from 'express';
import { downloadMapas } from '../../services/download-mapas.service';
import { populateMunicipios } from '../../services/populate-municipios.service';
import {exec, cronExec, getPrefixes, execDelete} from '../../services/process-queimadas.service';


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

async function queimadasExecController(_req:Request, res: Response) {
  exec();
  return res.status(201).json({message: 'script iniciado com sucesso!'});
}

async function queimadasCronExecController(req: Request, res: Response) {
  const cron_time: string | undefined = req.query.cron_time?.toString();
  if (!cron_time){
    return res.status(400).json({message: 'Contrab time não enviado!'});
  }
  cronExec(cron_time);
  return res.status(201).json({message: 'Agendamento cadastrado!'});
}

async function queimadasGetPrefixesController(_req:Request, res:Response) {
  const prefixes: Array<string> = await getPrefixes()
  .then((resp) => resp.map(
    (prefixObj) => prefixObj.prefix)
  )

  if (prefixes.length < 1){
    return res.status(204).send({message: "Não há prefixos cadastrados"});
  }
  
  return res.status(200).send({prefixes: prefixes});

}
async function queimadasDeleteController(req:Request, res:Response) {
  const prefixes: Array<string> = await getPrefixes()
  .then((resp) => resp.map(
    (prefixObj) => prefixObj.prefix)
  )

  const requestedPrefix: string = req.query.prefix ? req.query.prefix.toString() : '';

  if (requestedPrefix != '' && !prefixes.includes(requestedPrefix)){
    return res.status(400).send({message: "Prefixo inválido!"});
  }

  await execDelete([requestedPrefix]);

  return res.status(200).send({message: "Deletado!"});

}

export default { downloadMapasController, populateMunicipiosController,
   queimadasExecController, queimadasCronExecController, queimadasGetPrefixesController, queimadasDeleteController};
