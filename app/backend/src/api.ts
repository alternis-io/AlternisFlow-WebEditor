// FIXME: rename file to api.ts

import * as express from 'express';
import * as cors from 'cors';
import * as assert from "node:assert";
import * as crypto from "node:crypto";
import { PrismaClient, Document, User, WithId, WithToken, DocumentList } from './prisma';

const prisma = new PrismaClient();

const app = express()
  .use(express.json())
  .use(cors({
    origin: "http://localhost:3001",
  }));

export interface RunOpts {
  port?: number;
}

export async function run(opts: RunOpts = {}) {
  app.get<{}, User | null, WithToken>(
    '/users/me',
    async function getMyUser(req, res) {
      assert(req.body.token);
      const me = await prisma.user.findUniqueOrThrow({
        where: {
          token: req.body.token, // FIXME: header
        },
      });
      res.json(me);
      res.end();
    }
  );

  app.post<{}, WithId & WithToken, User>(
    '/users/me',
    async function register(req, res) {
      assert(req.body.id);
      // FIXME: horrible temp token gen
      // FIXME: use a blob
      const base64Token = crypto.randomBytes(32).toString("base64");
      const me = await prisma.user.create({
        data: {
          ...req.body,
          token: base64Token,
        },
      });
      assert(me.token !== null);
      res.json(me as User & WithToken);
      res.end();
    }
  );

  app.post<{}, Partial<Document>, Partial<Document> & WithToken>(
    '/users/me/documents',
    async function createDocument(req, res) {
      assert(req.body.name, "must have a name");
      assert(req.body.token, "can't create a document if not logged in");
      const doc = await prisma.document.create({
        data: {
          name: req.body.name,
          jsonContents: req.body.jsonContents ?? "{}",
          owner: {
            connect: {
              token: req.body.token, // FIXME: use headers for token
            }
          }
        },
        select: {
          id: true,
          name: true,
        },
      });

      res.json(doc);
      res.end();
    }
  );

  app.get<{}, DocumentList, WithToken>(
    '/users/me/documents',
    async function getMyDocumentList(req, res) {
      assert(req.body.token, "request body missing token");

      const docs = await prisma.document.findMany({
        select: {
          id: true,
          name: true,
          ownerId: true,
          updatedAt: true,
        },
        where: {
          owner: {
            token: req.body.token,
          },
        },
        // FIXME: do proper paging, this is just for safety
        take: 1000,
      });

      res.json(docs);
      res.end();
    }
  );

  app.get<{}, DocumentList, WithToken>(
    '/users/me/documents/recent',
    async function getMyRecentDocumentList(req, res) {
      assert(req.body.token, "request body missing token");

      const docs = await prisma.document.findMany({
        select: {
          id: true,
          name: true,
          ownerId: true,
          updatedAt: true,
        },
        where: {
          owner: {
            token: req.body.token,
          }
        },
        take: 50,
        orderBy: {
          updatedAt: "desc",
        },
      });

      res.json(docs);
      res.end();
    }
  );

  app.get<WithId, Document>(
    '/users/me/documents/:id',
    async function getMyDocument(req, res){
      assert(req.body.token, "request body missing token");

      const doc = await prisma.document.findUniqueOrThrow({
        where: {
          id: req.params.id,
          // FIXME: no idea if this works
          owner: {
            token: req.body.token,
          },
        },
      });

      res.json(doc);
      res.end();
    }
  );

  assert(!process.env.PORT || !Number.isNaN(process.env.PORT), `PORT in env '${process.env.PORT}' not a number`);
  const port = opts.port ?? Number(process.env.PORT);
  assert(port, "No port was set, either set PORT in the environment or pass one explicitly through the API");

  await new Promise<void>((resolve) => app.listen(port, resolve));

  console.log(`Service listening on port ${port}`);
}

if (module === require.main)
  void run();
