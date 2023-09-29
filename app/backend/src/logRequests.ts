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
      maxSize: '20m',
      level: 'error',
    }),
    new DailyRotateFileTransport({
      filename: 'server',
      extension: '.log',
      dirname: process.env.LOG_DIR ?? process.cwd(),
      zippedArchive: true,
      maxSize: '20m',
    }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ]
});

const reset = "\x1b[0m";
const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const magenta = "\x1b[34m";
const cyan = "\x1b[35m";

export function logRequests<
  Req extends express.Request<any, any, any, qs.ParsedQs, { log: winston.Logger }>,
  Res extends express.Response<any, { log: winston.Logger }>
>(req: Req, res: Res, next: express.NextFunction) {
  res.locals.log = log;
  // FIXME: note that nginx already logs this all
  // FIXME: see if winston provides this better
  const timestamp = new Date().toISOString();
  log.info({
    level: 'info',
    message:
      `${cyan}${timestamp} | `
      + `${yellow}${req.method.toUpperCase()} '${req.url}'\n`
      + reset,
    ip: req.ip,
    url: req.url,
    method: req.method,
    time: timestamp,
  });
  next();
}

export function logErrors<
  Req extends express.Request<any, any, any, qs.ParsedQs, { log: winston.Logger }>,
  Res extends express.Response<any, { log: winston.Logger }>
>(err: Error, req: Req, res: Res, next: express.NextFunction) {
  // NOTE: nginx really does this all 
  // FIXME: see if winston provides this better
  const timestamp = new Date().toISOString();
  log.error({
    level: 'error',
    message:
      `${cyan}${timestamp} | `
      + `${yellow}${req.method.toUpperCase()} '${req.url}'\n`
      + `${red}${err.stack}\n`
      + reset,
    ip: req.ip,
    url: req.url,
    method: req.method,
    time: timestamp,
  });
  next(err);
}


export default logRequests;
