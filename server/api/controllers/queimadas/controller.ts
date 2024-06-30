import { Request, Response } from 'express';
import { queimadas, count, sources } from '../../services/queimadas.service';
import { entidadesComDados } from '../../services/mapas.service';

async function find(req: Request, res: Response) {
  const criteria = `mapas_${req.url.split('?')[0].split('/').pop()}` as Parameters<
    typeof entidadesComDados
  >[0];

  const source = req.params.source?.toString();

  const result = await entidadesComDados(criteria, {
    source: source === 'latest' ? undefined : source,
    full: req.query.full?.toString() === 'true',
  });

  return res.status(result ? 200 : 204).send(result);
}

async function getSources(_: Request, res: Response) {
  sources().then((result) => res.status(result ? 200 : 204).send(['latest', ...result]));
}

async function get(req: Request, res: Response) {
  const page = parseInt((req.query.page || '1').toString());
  const perPage = parseInt((req.query.per_page || '100').toString());

  const municipio = req.params.municipio ? parseInt(req.params.municipio) : undefined;
  const estado = req.params.estado ? parseInt(req.params.estado) : undefined;
  const bioma = req.params.bioma || undefined;
  const source =
    req.params.source && req.params.source !== 'latest' ? req.params.source : undefined;
  const detailed = req.query.detailed?.toString().toLowerCase() === 'true';

  const criteria = { municipio, estado, bioma, source } as Parameters<typeof count>[0];

  const queimadasCount = await count(criteria);

  const result = await queimadas({
    ...criteria,
    limit: perPage,
    page: page,
    detailed: detailed,
  });

  const lastPage = Math.ceil(queimadasCount / perPage);

  let partialResponse = res.status(result ? 200 : 204);

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
