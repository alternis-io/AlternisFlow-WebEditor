import express from 'express';
import assert from "node:assert";
import { expressFixAsyncify } from "../util";
import { PrismaClient, Document, User, WithId, DocumentList } from '../prisma';
import { generateAccessToken, requireAuthToken } from "./auth";
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

const apiV1: express.Router = express.Router();

apiV1.get<{}, User | null>(
  '/users/me',
  requireAuthToken,
  expressFixAsyncify(async function getMyUser(req, res) {
    assert(req.headers.authorization, "can't create a document if not logged in");
    const me = await prisma.user.findUniqueOrThrow({
      where: {
        token: req.headers.authorization.slice("Mike ".length), }, });
    res.json(me);
    res.end();
  })
);

apiV1.post<{}, WithId, User>(
  '/users/me',
  async function register(req, res) {
    // FIXME: add type checking step
    if (!req.body.email) throw createHttpError(400);
    const token = generateAccessToken({ email: req.body.email });
    const me = await prisma.user.create({
      data: {
        // FIXME: do not pass unsanitized reqs
        id: req.body.id,
        email: req.body.email,
        token,
      },
    });
    assert(me.token !== null);
    res.json(me as User);
    res.end();
  }
);

apiV1.post<{}, Partial<Document>, Partial<Document>>(
  '/users/me/documents',
  requireAuthToken,
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

apiV1.get<{}, DocumentList>(
  '/users/me/documents',
  requireAuthToken,
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

apiV1.get<{}, DocumentList>(
  '/users/me/documents/recent',
  requireAuthToken,
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
  requireAuthToken,
  expressFixAsyncify(async function getMyDocument(req, res) {
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
  })
);

export { apiV1 };
