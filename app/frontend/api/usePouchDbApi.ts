import React from "react";
import { Document, DocumentHeader, useAppState } from "../AppState";
import type { Id, UseApiResult } from ".";
import { create } from "zustand";

// REPORTME: types don't allow using this with vite
// @ts-ignore
import * as _PouchDB from "pouchdb/dist/pouchdb";
const PouchDB = _PouchDB as typeof import("pouchdb");
// @ts-ignore
import * as _PouchDBUpsert from "pouchdb-upsert/dist/pouchdb.upsert";
import { useAsyncEffect } from "@bentley/react-hooks";
const PouchDBUpsert = _PouchDBUpsert as typeof import("pouchdb-upsert");

PouchDB.plugin(PouchDBUpsert);

declare global {
  var _pouchdb: PouchDB.Database<{}>;
}

const docs = new PouchDB("alternis-v1/documents");
globalThis._pouchdb = docs;

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
      const result = await docs.upsert(`${next.id}`, () => next);
      //(next as any)._rev = result.rev;
      return next as any as undefined; // FIXME: why?
    },

    async updateDocumentMeta(id: Id, patch: Partial<Document>): Promise<void> {
      const prev = await docs.get(id);
      return docs.put({ ...prev, ...patch, _id: `${id}` }).then();
    },

    async deleteDocument(id: Id): Promise<void> {
      const prev = await docs.get(id);
      await docs.remove(prev);
      usePouchDbStore.setState((prev) => ({
        documents: prev.documents.filter(d => d._id !== id && !d._deleted),
      }))
    },

    async createDocument(doc: Partial<Document> = {}) {
      const ownerEmail = undefined;
      const tempDocId = `${getNextInvalidId()}`;
      await docs.put<Document>({
        name: "",
        ownerEmail,
        updatedAt: new Date().toString(),
        functions: {},
        variables: {},
        dialogues: {},
        participants: [],
        ...doc,
        _id: tempDocId,
        id: tempDocId,
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

interface PouchDbStoreState {
  documents: DocumentHeader[];
  documentsInitStarted: boolean;
}

const usePouchDbStore = create<UseApiResult & PouchDbStoreState>(() => ({
  documentsInitStarted: false,
  documents: [] as DocumentHeader[],
  me: undefined,
  ...stable,
}));

let usePouchDbApiCount = 0;

export const usePouchDbApi = <F extends (s: UseApiResult) => any>(
  getter?: F
): F extends (s: UseApiResult) => infer R ? R : UseApiResult => {
  // FIXME: this duplicates the store
  const documents = usePouchDbStore(s => s.documents);

  useAsyncEffect(async () => {
    if (usePouchDbStore.getState().documentsInitStarted)
      return;

    usePouchDbStore.setState({ documentsInitStarted: true })

    const allDocs = await docs.allDocs<Document>({
      include_docs: true,
    });

    usePouchDbStore.setState({
      documents: allDocs.rows.map(r => r.doc!).filter(d => !d._deleted),
    });
  }, []);

  // FIXME: use render effect?
  React.useLayoutEffect(() => {
    ++usePouchDbApiCount;
    if (usePouchDbApiCount !== 1)
      return;

    docs.changes({ since: "now", include_docs: true, live: true })
      .on("change", (change) => {
        // FIXME: shouldn't only the current document be "populated" to prevent excess memory usage?
        usePouchDbStore.setState(prevState => {
          const prev = prevState.documents;
          if (!prev) return prevState;
          let next = prev.slice();
          const index = next.findIndex(d => d.id === change.id);
          const newDoc = change.doc as any as Document;
          if (index !== -1) next[index] = newDoc;
          else next.push(newDoc);
          if (change.deleted) next = next.filter(d => d._id !== change.id);
          return { ...prevState, documents: next };
        });
      })
      .on("error", (err) => {
        // FIXME: set react error boundary?
        console.error(err);
      });

    return () => {
      --usePouchDbApiCount;
    };
  }, []);

  const state = usePouchDbStore();

  return typeof getter === "function" ? getter(state) : state;
};
