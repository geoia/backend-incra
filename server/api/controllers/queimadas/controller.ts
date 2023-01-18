import { Request, Response } from 'express';
import queimadas from '../../services/queimadas.service';

export default {
  municipio: async (req: Request, res: Response) => {
    const { municipio } = req.params;
    const { page, simplify } = req.query;

    const result = await queimadas.municipio({
      municipio: parseInt(municipio),
      page: parseInt((page || '1').toString()),
      simplify: simplify?.toString().toLocaleLowerCase() === 'y',
    });

    res.status(200).send(result);
  },
  estado: async (req: Request, res: Response) => {
    const { estado } = req.params;
    const { page, simplify } = req.query;

    const result = await queimadas.estado({
      estado: parseInt(estado),
      page: parseInt((page || '1').toString()),
      simplify: simplify?.toString().toLocaleLowerCase() === 'y',
    });

    res.status(200).send(result);
  },
};
