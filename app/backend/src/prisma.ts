export * from "@prisma/client";

import type { Document } from "@prisma/client";

// FIXME: rename
export interface WithId {
  id: number;
}

export interface WithToken {
  token: string;
}

export type DocumentList = Pick<Document, "id" | "name" | "ownerId" | "updatedAt">[];
