import { Request, Response } from 'express';
import { queimadas, count, sources } from '../../services/queimadas.service';
import { entidadesComDados } from '../../services/mapas.service';

async function find(req: Request, res: Response) {
  const criteria = req.url.includes('municipios') ? 'mapas_municipios' : 'mapas_estados';

  const result = await entidadesComDados(criteria);

  return res.status(result ? 200 : 204).send(result);
}

async function getSources(_: Request, res: Response) {
  sources().then((result) => res.status(result ? 200 : 204).send(result));
}

async function get(req: Request, res: Response) {
  const criteria = req.params.municipio
    ? { municipio: parseInt(req.params.municipio) }
    : { estado: parseInt(req.params.estado) };

  const queimadasCount = await count(criteria);

  const page = parseInt((req.query.page || '1').toString());
  const perPage = parseInt((req.query.per_page || '100').toString());
  const source = req.query.source?.toString();

  const result = await queimadas({
    ...criteria,
    source,
    limit: perPage,
    page: page,
    detailed: req.query.detailed?.toString().toLowerCase() === 'true',
  });

  const lastPage = Math.ceil(queimadasCount / perPage);

  let partialResponse = res
    .status(result ? 200 : 204)
    .setHeader('x-queimadas-count', queimadasCount);

  if (queimadasCount > 0) {
    partialResponse = partialResponse
      .setHeader('x-queimadas-pages-current', page)
      .setHeader('x-queimadas-pages-first', 1)
      .setHeader('x-queimadas-pages-last', lastPage);

    if (page > 1) {
      partialResponse = partialResponse.setHeader(
        'x-queimadas-pages-previous',
        Math.min(page - 1, lastPage)
      );
    }

    if (lastPage > page) {
      partialResponse = partialResponse.setHeader('x-queimadas-pages-next', page + 1);
    }
  }

  return partialResponse.send(result);
}

export default { get, getSources, find };
