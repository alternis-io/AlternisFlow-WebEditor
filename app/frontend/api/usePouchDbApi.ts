import { Document } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
import type { DocumentList, Id, UseApiResult } from ".";
import  * as PouchDB from "pouchdb";

const docs = new PouchDB("alternis-v1/documents");

// FIXME: can replace recents with a couchdb query?
const recentsDocId = "recents" as const;
const recentsDocId = "recents" as const;

// FIXME: use sequence
const getNextInvalidId = () => -Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

export const usePouchDbApi = (): UseApiResult => {
  return {
    computed: {
      get isLoggedIn() { return true; },
    },

    api: {
      async syncMyRecentDocuments() {
        // syncing is a no-op in couchdb
      },

      async getDocument(id: Id): Promise<Document> {
        return docs.get<Document>(id);
      },

      async patchDocument(next: Document): Promise<void> {
        const result = await docs.put({ ...next, _id: `${next.id}` });
        (next as any)._rev = result.rev;
        return next as any as undefined; // FIXME: why?
      },

      async updateDocumentMeta(id: Id, patch: Partial<Document>): Promise<void> {
        const prev = await docs.get(id);
        return docs.put({ ...prev, ...patch, _id: `${id}` }).then();
      },

      async deleteDocument(id: Id): Promise<void> {
        const prev = await docs.get(id);
        await docs.remove(prev);
      },

      async createDocument(doc: { name?: string } = {}) {
        const ownerEmail = undefined;
        const tempDocId = `${getNextInvalidId()}`;
        await docs.put<Document>({
          _id: tempDocId,
          id: tempDocId,
          name: doc.name ?? "",
          ownerEmail,
          updatedAt: new Date(),
          functions: {},
          variables: {},
          dialogues: {},
          participants: [],
        });
      },

      async duplicateDocument(toCopy: { id: Id }) {
        const ownerEmail = undefined;
        const tempDocId = `${getNextInvalidId()}`;
        const doc = await docs.get<Document>(toCopy.id);
        await docs.put<Document>({
          ...doc,
          ownerEmail,
          _id: tempDocId,
          id: tempDocId,
        });
      },
    },
  };
};
