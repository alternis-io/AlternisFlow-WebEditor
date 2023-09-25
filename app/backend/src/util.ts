import * as express from 'express';

/**
 * A successful promise is considered as ending the middleware chain, and therefore
 * `next` is not called
 */
export function expressFixAsyncify<Req, Res>(
  cb: (
    req: Req,
    res: Res,
  ) => Promise<void>
) {
  return (
    req: Req,
    res: Res,
    next: express.NextFunction
  ) => cb(req, res).catch(next);
}
