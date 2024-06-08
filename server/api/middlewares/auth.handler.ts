import { Request, Response, NextFunction } from 'express';
import auth from 'basic-auth';
import compare from 'tsscmp';

function credentialsIsInvalid(user: string, pass: string) {
  let valid = true;

  valid = compare(user, process.env.ADM_USER as string) && valid;
  valid = compare(pass, process.env.ADM_PASS as string) && valid;

  return !valid;
}

export default function authHandler(
  req: Request,
  _res: Response,
  _next: NextFunction
): Response | void {
  const credentials = auth(req);

  if (credentialsIsInvalid(credentials?.name || '', credentials?.pass || '')) {
    return _res.status(401).end();
  }
  _next();
}
