import express from 'express';
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
      where: { id: req.user!.id },
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
        passwordHash,
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
      select: { id: true, passwordHash: true },
      where: { email: req.body.email },
    });

    // FIXME: confirm this status
    const noSuchUserError = createHttpError(400, "The username or password is not correct");

    if (me === null)
      throw noSuchUserError;

    if (!await Bun.password.verify(req.body.password, me.passwordHash))
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
            id: req.user!.id,
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
        ownerId: undefined, // FIXME: note that owner change is not allowed
      },
    });

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
      where: { owner: { id: req.user!.id } },
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
        ownerId: true,
        updatedAt: true,
      },
      where: {
        // FIXME: why doesn't token work?
        owner: { id: req.user!.id },
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

export { apiV1 };
