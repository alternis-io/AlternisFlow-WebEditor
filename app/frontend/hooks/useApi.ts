import { AppState } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
//import * as polyfills from "../polyfills";
import type { Document, DocumentList, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";
import { StoreApi, UseBoundStore, create } from "zustand";
import * as jose from "jose";
import { persist } from "zustand/middleware";

const authv1key = "authv1_tok";

export interface UseApiResult {
  // FIXME: put these labels as subobjects
  // config
  baseUrl: string;

  // state
  me: Pick<User, "id" | "email"> | undefined;
  documents: DocumentList | undefined;

  /** computed values must be in a subobject, also they can't be persisted */
  computed: {
    isLoggedIn: boolean;
  }
  // FIXME: need to standardize this, but these should all just mutate the store reactively,
  // and be renamed to "sync"
  api: {
    register: (user: RegisterUserData) => Promise<void>;
    login: (user: RegisterUserData) => Promise<void>;
    logout: () => Promise<void>;
    syncMe(): Promise<void>;
    syncMyRecentDocuments(): Promise<void>;
    getDocument(id: string): Promise<AppState["document"]>;
    updateDocument(id: number, patch: Partial<Document>): Promise<void>;
    deleteDocument(id: number): Promise<void>;
    createDocument(doc?: { name?: string }): Promise<void>;
  };
}

interface ApiState extends UseApiResult {
  _token: string | undefined;
  _apiFetch: (subpath: string, reqOpts?: RequestInit) => Promise<Response>;
  _likeLogin: (subpath: "register" | "login", user: RegisterUserData) => Promise<void>;
}

const DEFAULT_API_PORT = 4222;

const defaultLocalApiState = Object.freeze({
  baseUrl: `http://${window.location.hostname}:${DEFAULT_API_PORT}/api/v1`,
  _token: undefined,
  documents: undefined,
  // FIXME: put user id in the token so we can retrieve it if already logged in
  me: undefined,
} as ApiState);

const initialToken = localStorage.getItem(authv1key) ?? undefined;

let initialMe: Pick<User, "id" | "email"> | undefined;
try {
  initialMe = initialToken
    && jose.decodeJwt(initialToken)?.user as Pick<User, "id" | "email">
    || undefined;
} catch {}

const initialLocalApiState = Object.freeze({
  ...defaultLocalApiState,
  _token: initialToken,
  me: initialMe,
});

// FIXME: use sequence
const getNextInvalidId = () => -Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const useLocalApiState = create<ApiState>()((set, get) => ({
  ...initialLocalApiState,

  computed: {
    get isLoggedIn() { return get()._token !== undefined; },
  },

  // FIXME: move out but take reference to state
  _apiFetch: async (subpath: string, reqOpts: RequestInit = {}) => {
    assert(subpath.startsWith("/"));
    const result = await fetch(`${get().baseUrl}${subpath}`, {
      ...reqOpts,
      headers: {
        ...get()._token && {'Authorization': `Bearer ${get()._token}`},
        ...reqOpts.headers,
      },
    });
    if (!result.ok)
      throw result;
    return result;
  },

  _likeLogin: async (subpath: "register" | "login", user: RegisterUserData) => {
    const resp = await get()._apiFetch(`/users/me/${subpath}`, {
      method: "POST",
      body: JSON.stringify(user),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const respJson = await resp.json();
    assert(respJson?.token, "no token in login response");
    set({
      _token: respJson.token as string,
      me: respJson
    });
  },

  api: {
    register: (user: RegisterUserData) => get()._likeLogin("register", user),
    login: (user: RegisterUserData) => get()._likeLogin("login", user),

    async logout() {
      set({ _token: undefined });
      // FIXME: logout on the backend
    },

    async syncMe() {
      return get()._apiFetch("/users/me").then((r) => r.json());
    },

    async syncMyRecentDocuments() {
      const documents = await get()._apiFetch("/users/me/documents/recents").then((r) => r.json() as Promise<DocumentList>);
      set({ documents });
    },

    async getDocument(id: string): Promise<AppState["document"]> {
      return get()._apiFetch(`/users/me/documents/${id}`).then((r) => r.json());
    },

    async updateDocument(id: number, patch: Partial<Document>): Promise<void> {
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

      // FIXME: use real id from parsed token
      const ownerId = get().me?.id;
      if (!ownerId)
        return;

      const tempDocId = getNextInvalidId();

      set((s) => ({
        documents: (s.documents ?? []).concat({
          ...doc,
          id: tempDocId,
          name: "New Document",
          updatedAt: new Date(),
          ownerId,
        }),
      }));

      // FIXME: rollback on error
      const newDoc = await get()._apiFetch(`/users/me/documents`, {
        method: "POST",
        body: JSON.stringify(doc),
        //headers: { 'Content-Type': 'application/octet-stream' },
      }).then((r) => r.json());

      set((s) => ({
        documents: (s.documents ?? []).map(d => d.id !== tempDocId ? d : {
          ...d,
          ...newDoc,
        })
      }));
    },
  },
}));

useLocalApiState.subscribe((state, prevState) => {
  if (state._token !== prevState._token) {
    if (state._token !== undefined)
      localStorage.setItem(authv1key, state._token)
    else
      localStorage.removeItem(authv1key)
  }
});

export const useApi: UseBoundStore<StoreApi<UseApiResult>> = useLocalApiState;
