import * as express from 'express';
import * as assert from "node:assert";
import * as crypto from "node:crypto";
import { expressFixAsyncify } from "../util";
import { PrismaClient, Document, User, WithId, WithToken, DocumentList } from '../prisma';

const prisma = new PrismaClient();

const apiV1: express.Router = express.Router();

apiV1.get<{}, User | null, WithToken>(
  '/users/me',
  expressFixAsyncify(async function getMyUser(req, res) {
    assert(req.headers.authorization, "can't create a document if not logged in");
    const me = await prisma.user.findUniqueOrThrow({
      where: {
        token: req.headers.authorization.slice("Mike ".length),
      },
    });
    res.json(me);
    res.end();
  })
);

apiV1.post<{}, WithId & WithToken, User>(
  '/users/me',
  async function register(req, res) {
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

apiV1.post<{}, Partial<Document>, Partial<Document> & WithToken>(
  '/users/me/documents',
  expressFixAsyncify(async function createDocument(req, res) {
    // FIXME: 400
    assert(req.body.name, "must have a name");
    // FIXME: 401
    assert(req.headers.authorization, "missing authorization");

    const doc = await prisma.document.create({
      data: {
        name: req.body.name,
        jsonContents: req.body.jsonContents ?? "{}",
        owner: {
          connect: {
            token: req.headers.authorization.slice("Mike ".length),
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    res.json(doc);
    res.end();
  })
);

apiV1.get<{}, DocumentList, WithToken>(
  '/users/me/documents',
  async function getMyDocumentList(req, res) {
    // FIXME: 401
    assert(req.headers.authorization, "missing authorization");

    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        updatedAt: true,
      },
      where: {
        owner: {
          token: req.headers.authorization.slice("Mike ".length),
        },
      },
      // FIXME: do proper paging, this is just for safety
      take: 1000,
    });

    res.json(docs);
    res.end();
  }
);

apiV1.get<{}, DocumentList, WithToken>(
  '/users/me/documents/recent',
  async function getMyRecentDocumentList(req, res) {
    // FIXME: 401
    assert(req.headers.authorization, "missing authorization");

    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        updatedAt: true,
      },
      where: {
        owner: {
          token: req.headers.authorization.slice("Mike ".length),
        },
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

apiV1.get<WithId, Document>(
  '/users/me/documents/:id',
  async function getMyDocument(req, res){
    // FIXME: 401
    assert(req.headers.authorization, "missing authorization");

    // FIXME: bad route if failed
    const id = Number(req.params.id);

    const doc = await prisma.document.findUniqueOrThrow({
      where: {
        id,
        // FIXME: no idea if this works
        owner: {
          token: req.headers.authorization.slice("Mike ".length),
        },
      },
    });

    res.json(doc);
    res.end();
  }
);

export { apiV1 };
