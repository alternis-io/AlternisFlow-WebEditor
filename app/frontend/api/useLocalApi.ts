import { AppState } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
//import * as polyfills from "../polyfills";
import type { Document, DocumentList, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";
import { StoreApi, UseBoundStore, create } from "zustand";
import { UseApiResult } from ".";

const defaultLocalApiState = Object.freeze({
  me: undefined,
  documents: undefined,
});

const initialLocalApiState = Object.freeze({ });

// FIXME: use sequence
const getNextInvalidId = () => -Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const promisifyReq = <T,>(req: IDBRequest<T>) => {
  const thenable = new Promise<IDBDatabase>((res, rej) => {
    req.onsuccess = (e) => res(e.target!.result);
    req.onerror = rej;
  });
  return { ...thenable, ...req };
};

const dbPromise = new Promise<IDBDatabase>((res, rej) => {
  const dbReq = indexedDB.open("alternis-local", 1);
  dbReq.onsuccess = (e) => res(e.target!.result);
  dbReq.onerror = rej;
  dbReq.onupgradeneeded = (e) => {
    const db: IDBDatabase = e.target!.result;

    const documents = db.createObjectStore("documents", { keyPath: "id" });
    documents.createIndex("name", "name", { unique: true });

    const _recents = db.createObjectStore("documents/recents", { autoIncrement: true });
  };
});

dbPromise.then(db => {
  db.onerror = (e) => {
    // FIXME: handle this
    if (e.type === "ERR_VER") {}
  };

  // FIXME: handle this
  db.onversionchange = (e) => {};
});

const useLocalApiState = create<UseApiResult>()((set, get) => ({
  ...initialLocalApiState,

  computed: {
    get isLoggedIn() { return true; },
  },

  api: {
    async syncMyRecentDocuments() {
      const db = await dbPromise;
      const recentsStore = db.transaction("documents/recents", "readonly").objectStore("documents/recents")
      await new Promise((res, rej) => {
        const req = recentsStore.getAll();
        req.onsuccess = (e) => res(e.target!.result);
        req.onerror = 
      });
      const documents = await get()._apiFetch("/users/me/documents/recents").then((r) => r.json() as Promise<DocumentList>);
      set({ documents });
    },

    async getDocument(id: string): Promise<AppState["document"]> {
      return get()._apiFetch(`/users/me/documents/${id}`).then((r) => r.json());
    },

    async patchDocument(id: number, prev: AppState, next: AppState): Promise<void> {
      const patch = jsonpatch.compare(prev, next);

      // nothing to update since local api cache only contains document metadata
      try {
        await get()._apiFetch(`/users/me/documents/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        throw err;
      }
    },

    async updateDocumentMeta(id: number, patch: Partial<Document>): Promise<void> {
      let prev: DocumentList[number] | undefined;

      set((s) => ({
        documents: (s.documents ?? []).map(d =>
          d.id === id
          ? (prev = d, { ...d, ...patch, id: d.id })
          : d
        ),
      }));

      try {
        await get()._apiFetch(`/users/me/documents/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        // rollback on error
        if (prev) {
          set((s) => ({
            documents: (s.documents ?? []).map(d => d.id === id ? prev! : d),
          }));
        }
        throw err;
      }
    },

    async deleteDocument(id: number): Promise<void> {
      let prevIndex: number | undefined;
      let prev: DocumentList[number] | undefined;

      // FIXME: when s.documents is undefined, optimistic state changes probably shouldn't do
      // anything? think that out
      set((s) => {
        prevIndex = s.documents?.findIndex(d => d.id === id);
        prev = prevIndex !== undefined && prevIndex !== -1 ? s.documents![prevIndex] : undefined;
        return {
          documents: (s.documents ?? []).filter(d => d.id !== id),
        };
      });

      try {
        await get()._apiFetch(`/users/me/documents/${id}`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        // rollback on error
        if (prev) {
          set((s) => ({
            // FIXME: reinsert at previous index
            documents: (s.documents ?? []).concat(prev!),
          }));
        }
        throw err;
      }
    },

    async createDocument(doc: { name?: string } = {}) {
      //const { CompressionStream } = await polyfills.getCompressionStreamImpl();

      // const docBlob = new Blob([JSON.stringify(doc)]);
      // const compressedDocument = docBlob.stream().pipeThrough(
      //   new CompressionStream('gzip')
      // );
      //

      const ownerEmail = get().me?.email;
      assert(ownerEmail !== undefined, "no owner email!");

      const tempDocId = getNextInvalidId();

      // FIXME: all these sets screw up the undo history! need a system to mitigate that
      // without desyncing everything...
      set((s) => ({
        documents: [
          {
            ...doc,
            id: tempDocId,
            name: "New Document",
            updatedAt: new Date(),
            ownerEmail,
          },
          ...s.documents ?? [],
        ],
      }));

      try {
        const newDoc = await get()._apiFetch(`/users/me/documents`, {
          method: "POST",
          body: JSON.stringify(doc),
          headers: { 'Content-Type': 'application/json' },
          //headers: { 'Content-Type': 'application/octet-stream' },
        }).then((r) => r.json());

        set((s) => ({
          documents: (s.documents ?? []).map(d => d.id !== tempDocId ? d : {
            ...d,
            ...newDoc,
          })
        }));
      } catch (err) {
        // FIXME: use immer for less manual rollback logic or something
        set((s) => ({
          documents: (s.documents ?? []).filter(d => d.id !== tempDocId),
        }));
      }
    },

    async duplicateDocument(doc: { id: number }) {
      console.log(doc);

      const tempDocId = getNextInvalidId();

      set((s) => {
        const srcDoc = s.documents?.find(d => d.id === doc.id);
        if (srcDoc === undefined) return s;
        return {
          documents: [
            {
              ...srcDoc,
              id: tempDocId,
              name: `${srcDoc.name} copy`, // FIXME: share with backend logic
              updatedAt: new Date(),
            },
            ...s.documents ?? [],
          ],
        };
      });

      try {
        const newDoc = await get()._apiFetch(`/users/me/documents/${doc.id}/duplicate`, {
          method: "POST",
          body: JSON.stringify({ id: doc.id }),
          headers: { 'Content-Type': 'application/json' },
        }).then((r) => r.json());

        set((s) => ({
          documents: (s.documents ?? []).map(d => d.id !== tempDocId ? d : {
            ...d,
            ...newDoc,
          })
        }));
      } catch (err) {
        // FIXME: use immer for less manual rollback logic or something
        set((s) => ({
          documents: (s.documents ?? []).filter(d => d.id !== tempDocId),
        }));
      }
    },
  },
}));

export const useLocalApi: UseBoundStore<StoreApi<UseApiResult>> = useLocalApiState;
