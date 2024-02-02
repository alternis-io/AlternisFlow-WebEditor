import React from "react";
import { Document, DocumentHeader } from "../AppState";
import type { Id, UseApiResult } from ".";
import  * as PouchDB from "pouchdb";

const docs = new PouchDB("alternis-v1/documents");

// FIXME: can replace recents with a couchdb query?
const recentsDocId = "recents" as const;

// FIXME: use sequence
const getNextInvalidId = () => -Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const stable = {
  api: {
    // syncing is a no-op in couchdb
    async syncMe() {},
    async syncMyRecentDocuments() {},

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

export const usePouchDbApi = (): UseApiResult => {
  const [documents, setDocuments] = React.useState<DocumentHeader[]>();

  // FIXME: use render effect?
  React.useLayoutEffect(() => {
    docs.changes({ since: "now", include_docs: true })
      .on("change", (change) => {
        setDocuments(prev => {
          if (!prev) return prev;
          let next = prev.slice();
          const index = next.findIndex(d => d.id === change.id);
          const newDoc = change.doc as any as Document;
          if (index !== -1) next[index] = newDoc;
          else next.push(newDoc);
          if (change.deleted) next = next.filter(d => d.id !== change.id);
          return next;
        });
      })
      .on("error", (err) => {
        // FIXME: set react error boundary?
        console.error(err);
      });
  }, []);

  return React.useMemo(() => ({
    documents,
    me: undefined,
    ...stable
  }), [documents]);
};
