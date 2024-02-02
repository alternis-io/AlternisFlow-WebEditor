import { AppState, Document, DocumentHeader } from "../AppState";

import type * as RemoteTypes from "dialogue-middleware-app-backend/lib/prisma";

export type DocumentList = DocumentHeader[];

export interface UseApiResult {
  // FIXME: put these labels as subobjects
  // config
  baseUrl: string;

  // state
  me: Pick<RemoteTypes.User, "email"> | undefined;
  documents: DocumentList | undefined;

  // private (for now) state
  _token: string | undefined;

  /** computed values must be in a subobject, also they can't be persisted */
  computed: {
    isLoggedIn: boolean;
  };

  // FIXME: need to standardize this, but these should all just mutate the store reactively,
  // and be renamed to "sync"
  api: {
    register?: (user: RemoteTypes.RegisterUserData) => Promise<void>;
    login?: (user: RemoteTypes.RegisterUserData) => Promise<void>;
    googleLogin: () => Promise<void>;
    logout: () => Promise<void>;
    syncMe(): Promise<void>;
    syncMyRecentDocuments(): Promise<void>;
    getDocument(id: number): Promise<Document>;
    updateDocumentMeta(id: number, patch: Partial<Document>): Promise<void>;
    // FIXME: unscrew the document type...
    patchDocument(next: Document): Promise<void>;
    deleteDocument(id: number): Promise<void>;
    createDocument(doc?: { name?: string }): Promise<void>;
    duplicateDocument(doc: { id: number }): Promise<void>;
  };
}
