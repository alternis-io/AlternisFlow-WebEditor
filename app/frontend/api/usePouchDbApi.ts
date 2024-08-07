import React from "react";
import { Document, DocumentHeader, useAppState } from "../AppState";
import type { DocumentList, Id, UseApiResult } from ".";
import { create } from "zustand";
import { useAllDocs } from "use-pouchdb";

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

export const docs = new PouchDB("alternis-v1/documents");

globalThis.global = globalThis;
globalThis._pouchdb = docs;

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

export const usePouchDbApi = <F extends (s: UseApiResult) => any>(
  getter?: F
): F extends (s: UseApiResult) => infer R ? R : UseApiResult => {
  const documents = useAllDocs({
    include_docs: true,
  });

  const state = React.useMemo(() => ({
    documents: documents.rows
      .filter(d => !d.doc!._deleted)
      .map(d => d.doc as DocumentHeader),
    me: undefined,
    ...stable
  }), [documents, stable]);

  return typeof getter === "function" ? getter(state) : state;
};
