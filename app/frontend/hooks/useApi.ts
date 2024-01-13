import { AppState } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
//import * as polyfills from "../polyfills";
import type { Document, DocumentList, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";
import { StoreApi, UseBoundStore, create } from "zustand";
import * as jose from "jose";
import * as jsonpatch from "fast-json-patch";

const authv1key = "authv1_tok";

const DEFAULT_DEV_PORT = 4222;

export const baseUrl = import.meta.env.PROD
  ? `https://${window.location.hostname}`
  : `http://${window.location.hostname}:${DEFAULT_DEV_PORT}`;

export const apiBaseUrl = `${baseUrl}/api/v1`;

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

interface ApiState extends UseApiResult {
  _token: string | undefined;
  _tokenPayload: jose.JWTPayload | undefined;
  _apiFetch: (subpath: string, reqOpts?: RequestInit) => Promise<Response>;
  _likeLogin: (subpath: "register" | "login", user: RegisterUserData) => Promise<void>;
}

const defaultLocalApiState = Object.freeze({
  baseUrl: apiBaseUrl,
  _token: undefined,
  _tokenPayload: undefined,
  me: undefined,
  documents: undefined,
} as ApiState);

let initialToken: string | undefined;
let initialTokenPayload: jose.JWTPayload | undefined;

try {
  const prevToken = localStorage.getItem(authv1key) ?? undefined;
  const prevTokenPayload = prevToken
    && jose.decodeJwt(prevToken)
    || undefined;
  // FIXME: 
  if (prevTokenPayload && prevTokenPayload.exp) {
    if (Date.now() / 1000 < prevTokenPayload.exp) {
      initialToken = prevToken;
      initialTokenPayload = prevTokenPayload;
      // FIXME: add a refresh token into the mix
      //const timeToExpire = prevTokenPayload.exp;
      //const _2MinutesInSecs = 2 * 60;
      //const _2MinutesBeforeExpiry = timeToExpire - _2MinutesInSecs;
      //setTimeout()
    }
  }
} catch {}

function extractUserFromGoogleToken(token: string | jose.JWTPayload) {
  if (typeof token === "string")
    token = jose.decodeJwt(token);
  return {
    email: token.email as string,
    givenName: token.given_name as string | undefined,
    familyName: token.family_name as string | undefined,
    fullName: token.full_name as string | undefined,
    pictureUrl: token.picture as string | undefined,
  };
}

const initialLocalApiState = Object.freeze({
  ...defaultLocalApiState,
  _token: initialToken,
  me: initialTokenPayload && {
    email: initialTokenPayload.email as string,
    givenName: initialTokenPayload.given_name as string | undefined,
    familyName: initialTokenPayload.family_name as string | undefined,
    fullName: initialTokenPayload.full_name as string | undefined,
    pictureUrl: initialTokenPayload.picture as string | undefined,
  }
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
    const token = get()._token;
    const result = await fetch(`${get().baseUrl}${subpath}`, {
      ...reqOpts,
      headers: {
        ...token && {'Authorization': `Bearer ${token}`},
        ...reqOpts.headers,
      },
    });

    if (!result.ok) {
      console.error("non-OK response", result);
      const err = Error(
        `Received non OK '${result.status} ${result.statusText}' response from service:\n`
        + await (result.headers.get('Content-Type') === 'application/json'
          ? result.json()
          : result.text())
      );
      alert(err);
      throw err;
    }

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

    async googleLogin() {
      const token = get()._token;
      assert(token, "token not set before implicit login");
      const resp = await get()._apiFetch(`/users/me/login/google`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      assert(resp.ok, "google login resp not ok");
      // FIXME: note not verifying the token on client
      set({ me: extractUserFromGoogleToken(token) });
    },

    async logout() {
      set({ _token: undefined });
      // FIXME: logout on the backend
    },

    async syncMe() {
      return get()._apiFetch("/users/me").then((r) => r.json());
    },

    async syncMyRecentDocuments() {
      if (!get().computed.isLoggedIn) return;
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

useLocalApiState.subscribe((state, prevState) => {
  if (state._token !== prevState._token) {
    if (state._token !== undefined)
      localStorage.setItem(authv1key, state._token)
    else
      localStorage.removeItem(authv1key)
  }
});

export const useApi: UseBoundStore<StoreApi<UseApiResult>> = useLocalApiState;
