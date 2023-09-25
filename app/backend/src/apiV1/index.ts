import express from 'express';
import assert from "node:assert";
import { expressFixAsyncify } from "../util";
import { PrismaClient, Document, User, WithId, DocumentList, WithToken } from '../prisma';
import { generateAccessToken, requireAuthToken } from "./auth";
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

const apiV1: express.Router = express.Router();

apiV1.get<{}, User | null>(
  '/users/me',
  requireAuthToken,
  expressFixAsyncify(async function getMyUser(req, res) {
    const me = await prisma.user.findUniqueOrThrow({
      where: { token: req.locals.token },
    });

    delete (me as any).passwordHash;
    res.json(me);
    res.end();
  })
);

apiV1.post<{}, WithId, { email: string; password: string }>(
  '/users/me/register',
  async function register(req, res) {
    // FIXME: add type checking step
    if (!req.body.email) throw createHttpError(400, "email field is missing");
    if (!req.body.password) throw createHttpError(400, "password field is missing");

    const passwordHash = await Bun.password.hash(req.body.password)
    const token = await generateAccessToken({ email: req.body.email });

    const me = await prisma.user.create({
      data: {
        // FIXME: do not pass unsanitized req.body directly everywhere
        email: req.body.email,
        token,
        passwordHash, // FIXME: is there a way to annotate this as sensitive?
      },
    });

    delete (me as any).passwordHash;
    res.json(me);
    res.end();
  }
);

apiV1.post<{}, WithToken, { email: string, password: string }>(
  '/users/me/login',
  async function login(req, res) {
    // FIXME: add type checking step
    if (!req.body.email) throw createHttpError(400, "email field is missing");
    if (!req.body.password) throw createHttpError(400, "password field is missing");

    const me = await prisma.user.findUnique({
      select: { passwordHash: true },
      where: { email: req.body.email },
    });

    // FIXME: confirm this status
    const noSuchUserError = createHttpError(400, "The username or password is not correct");

    if (me === null)
      throw noSuchUserError;

    if (!await Bun.password.verify(req.body.password, me.passwordHash))
      throw noSuchUserError;

    const token = await generateAccessToken({ email: req.body.email });

    res.json({ token });
    res.end();
  }
);


apiV1.post<{}, Partial<Document>, Partial<Document>>(
  '/users/me/documents',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    if (!req.body.name) throw createHttpError(400, "name field is missing");

    // FIXME: this can throw
    const doc = await prisma.document.create({
      data: {
        name: req.body.name,
        jsonContents: req.body.jsonContents ?? "{}",
        owner: {
          connect: {
            // FIXME: think again if we need to store the token...
            token: req.locals.token,
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
  expressFixAsyncify(async function getMyDocumentList(req, res) {
    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        updatedAt: true,
      },
      where: {
        owner: {
          token: req.locals.token,
        },
      },
      // FIXME: do proper paging, this is just for safety
      take: 1000,
    });

    res.json(docs);
    res.end();
  })
);

apiV1.get<{}, DocumentList>(
  '/users/me/documents/recent',
  requireAuthToken,
  expressFixAsyncify(async function getMyRecentDocumentList(req, res) {
    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        updatedAt: true,
      },
      where: {
        owner: { token: req.locals.token },
      },
      take: 50,
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json(docs);
    res.end();
  })
);

apiV1.get<WithId, Document>(
  '/users/me/documents/:id',
  requireAuthToken,
  expressFixAsyncify(async function getMyDocument(req, res) {
    // FIXME: bad route if failed
    const id = Number(req.params.id);

    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id");

    // FIXME: does info leak by throwing?
    const doc = await prisma.document.findUniqueOrThrow({
      where: {
        id,
        owner: { token: req.locals.token },
      },
    });

    res.json({
      ...doc,
      jsonContents: JSON.parse(doc.jsonContents),
    });
    res.end();
  })
);

export { apiV1 };
