export * from "@prisma/client";

import type { Document } from "@prisma/client";

export interface RegisterUserData {
  email: string;
  password: string;
}

// FIXME: rename
export interface WithId {
  id: number;
}

export interface WithToken {
  token: string;
}

export type CreateDocument = Pick<Document, "name" | "jsonContents">;

export type DocumentList = Pick<Document, "id" | "name" | "ownerId" | "updatedAt">[];
