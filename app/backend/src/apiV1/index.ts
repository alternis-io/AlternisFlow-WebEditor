import express from 'express';
import { expressFixAsyncify } from "../util";
import { PrismaClient, Document, User, WithId, DocumentList, WithToken } from '../prisma';
import { generateAccessToken } from "./auth";
import { requireAuthToken } from "../auth";
import createHttpError from 'http-errors';
// import { apiV1Github } from './github';
import { apiV1Google } from './google';
import * as jsonpatch from "fast-json-patch";

const prisma = new PrismaClient();

export const apiV1: express.Router = express.Router();

apiV1.get<{}, User | null>(
  '/users/me',
  requireAuthToken,
  expressFixAsyncify(async function getMyUser(req, res) {
    const me = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    delete (me as any).passwordHash;
    res.json(me);
    res.end();
  })
);

apiV1.post<{}, Omit<User, "passwordHash">, { email: string; password: string }>(
  '/users/me/register',
  expressFixAsyncify(async function register(req, res) {
    // FIXME: add type checking step
    if (!req.body.email) throw createHttpError(400, "email field is missing");
    if (!req.body.password) throw createHttpError(400, "password field is missing");

    const passwordHash = await Bun.password.hash(req.body.password)

    const me = await prisma.user.create({
      data: {
        email: req.body.email,
        token: passwordHash,
      },
    });

    const token = await generateAccessToken({ email: req.body.email, id: me.id });

    delete (me as any).passwordHash;
    res.json({ ...me, token });
    res.end();
  })
);

apiV1.post<{}, WithToken, { email: string, password: string }>(
  '/users/me/login',
  expressFixAsyncify(async function login(req, res) {
    // FIXME: add type checking step
    if (!req.body.email) throw createHttpError(400, "email field is missing");
    if (!req.body.password) throw createHttpError(400, "password field is missing");

    const me = await prisma.user.findUnique({
      select: { id: true, token: true },
      where: { email: req.body.email },
    });

    // FIXME: confirm this status
    const noSuchUserError = createHttpError(400, "The username or password is not correct");

    // NOTE: me.token === null is contrived since this routine doesn't make sense anymore
    if (me === null || me.token === null)
      throw noSuchUserError;

    if (!await Bun.password.verify(req.body.password, me.token))
      throw noSuchUserError;

    const token = await generateAccessToken({ email: req.body.email, id: me.id });

    res.json({ token });
    res.end();
  })
);

apiV1.post<{}, Partial<Document>, Partial<Document>>(
  '/users/me/documents',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    // FIXME: this can throw
    const doc = await prisma.document.create({
      data: {
        name: "New Project",
        jsonContents: req.body.jsonContents ?? "{}",
        owner: {
          connect: {
            email: req.user!.email,
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

apiV1.delete<{ id: number }, unknown, {}>(
  '/users/me/documents/:id',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id");

    await prisma.document.delete({ where: { id } });

    res.end();
  })
);

// FIXME: use ts-essentials#MarkRequired
apiV1.patch<{ id: number }, unknown, Partial<Document>>(
  '/users/me/documents/:id',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id");

    await prisma.document.update({
      where: { id },
      data: {
        // FIXME: note request shape is not verified! that should be done in some
        // middleware... although perhaps the orm already does a good enough job...
        ...req.body,
        id: undefined,
        ownerEmail: undefined, // FIXME: note that owner change is not allowed
      },
    });

    res.end();
  }),
);

apiV1.patch<{ id: number }, unknown, any>(
  '/users/me/documents/:id/patch',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id");

    const doc = await prisma.document.findUniqueOrThrow({
      where: { id },
      select: { jsonContents: true, },
    });

    /** NOTE: this is mutated in-place */
    const jsonContents = doc.jsonContents;
    const patch = req.body;

    jsonpatch.applyPatch(jsonContents, patch, true);

    await prisma.document.update({
      where: { id },
      data: {
        jsonContents: JSON.stringify(jsonContents),
      },
    });

    res.end();
  }),
);

apiV1.post<{ id: number }, Pick<Document, "id">, Partial<Document>>(
  '/users/me/documents/:id/duplicate',
  requireAuthToken,
  expressFixAsyncify(async function createDocument(req, res) {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id in path");

    if (typeof req.body.id !== "number")
      throw createHttpError(400, "body is missing numeric id field");

    const srcDoc = await prisma.document.findUniqueOrThrow({
      where: { id: req.body.id },
      select: {
        name: true,
        jsonContents: true,
      },
    });

    // FIXME: this can throw
    const doc = await prisma.document.create({
      data: {
        ...srcDoc,
        name: `${srcDoc.name} copy`,
        owner: {
          connect: {
            email: req.user!.email,
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
  }),
);

apiV1.get<{}, DocumentList>(
  '/users/me/documents',
  requireAuthToken,
  expressFixAsyncify(async function getMyDocumentList(req, res) {
    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerEmail: true,
        updatedAt: true,
      },
      where: { owner: { email: req.user!.email } },
      // FIXME: do proper paging, this is just for safety
      take: 500,
    });

    res.json(docs);
    res.end();
  })
);

apiV1.get<{}, DocumentList>(
  '/users/me/documents/recents',
  requireAuthToken,
  expressFixAsyncify(async function getMyRecentDocumentList(req, res) {
    const docs = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        ownerEmail: true,
        updatedAt: true,
      },
      where: {
        // FIXME: why doesn't token work?
        owner: { email: req.user!.email },
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
    const id = Number(req.params.id);

    if (Number.isNaN(id))
      throw createHttpError(400, "invalid id");

    // FIXME: does info leak by throwing?
    const doc = await prisma.document.findUniqueOrThrow({
      where: {
        id,
        owner: { token: req.token },
      },
    });

    res.json({
      ...doc,
      jsonContents: JSON.parse(doc.jsonContents),
    });
    res.end();
  })
);

// might as well disable unused routes
// apiV1.use(apiV1Github);
apiV1.use(apiV1Google);
