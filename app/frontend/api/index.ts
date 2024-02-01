import { AppState } from "../AppState";
import type { Document, DocumentList, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";

export interface UseApiResult {
  // FIXME: put these labels as subobjects
  // config
  baseUrl: string;

  // state
  me: Pick<User, "email"> | undefined;
  documents: DocumentList | undefined;

  // private (for now) state
  _token: string | undefined;

  /** computed values must be in a subobject, also they can't be persisted */
  computed: {
    isLoggedIn: boolean;
  }
  // FIXME: need to standardize this, but these should all just mutate the store reactively,
  // and be renamed to "sync"
  api: {
    register: (user: RegisterUserData) => Promise<void>;
    login: (user: RegisterUserData) => Promise<void>;
    googleLogin: () => Promise<void>;
    logout: () => Promise<void>;
    syncMe(): Promise<void>;
    syncMyRecentDocuments(): Promise<void>;
    getDocument(id: string): Promise<AppState["document"]>;
    updateDocumentMeta(id: number, patch: Partial<Document>): Promise<void>;
    patchDocument(id: number, prev: AppState, next: AppState): Promise<void>;
    deleteDocument(id: number): Promise<void>;
    createDocument(doc?: { name?: string }): Promise<void>;
    duplicateDocument(doc: { id: number }): Promise<void>;
  };
}
