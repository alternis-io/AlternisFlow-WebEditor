import type express from 'express';
import winston from 'winston';
import DailyRotateFileTransport from 'winston-daily-rotate-file';

export const log = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'alteris-backend-v1' },
  transports: [
    new DailyRotateFileTransport({
      filename: 'error',
      extension: '.log',
      dirname: process.env.LOG_DIR ?? process.cwd(),
      // zippedArchive: true,
      maxSize: '20m'
    }),
    new DailyRotateFileTransport({
      filename: 'server',
      extension: '.log',
      dirname: process.env.LOG_DIR ?? process.cwd(),
      // zippedArchive: true,
      maxSize: '20m'
    }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ]
});

export function logRequests<
  Req extends express.Request<any, any, any, qs.ParsedQs, { log: winston.Logger }>,
  Res extends express.Response<any, { log: winston.Logger }>
>(req: Req, res: Res, next: express.NextFunction) {
  res.locals.log = log;
  log.info({
    level: 'info',
    message: `${req.method.toUpperCase()} '${req.url}' `,
    ip: req.ip,
    url: req.url,
    method: req.method,
  });
  next();
}

export function logErrors<
  Req extends express.Request<any, any, any, qs.ParsedQs, { log: winston.Logger }>,
  Res extends express.Response<any, { log: winston.Logger }>
>(err: Error, req: Req, res: Res, next: express.NextFunction) {
  res.locals.log = log;
  log.error({
    level: 'error',
    message: err.message,
    stack: err.stack,
    ip: req.ip,
    url: req.url,
    method: req.method,
    time: new Date().toISOString(),
  });
  next();
}


export default logRequests;

