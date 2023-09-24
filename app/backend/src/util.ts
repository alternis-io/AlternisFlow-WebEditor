import * as express from 'express';

// 401
export class AuthorizationError extends Error {}
// 400
export class ApiMisuseError extends Error {}

// handle promises in express@<5
// FIXME: use bun
export function expressFixAsyncify<Req, Res>(
  cb: (
    req: Req,
    res: Res,
    next: express.NextFunction,
  ) => Promise<void>
) {
  return (
    req: Req,
    res: Res,
    next: express.NextFunction
  ) => cb(req, res, next).catch(next);
}
