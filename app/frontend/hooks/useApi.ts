import { AppState } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
//import * as polyfills from "../polyfills";
import type { CreateDocument, DocumentList, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";
import { useMemo, useState } from "react";
import { create } from "zustand";

const authv1key = "authv1_tok";

export interface ApiClient {
  register: (user: RegisterUserData) => Promise<void>;
  login: (user: RegisterUserData) => Promise<void>;
  logout: () => Promise<void>;
  getMyUser(): Promise<User>;
  getMyDocumentList(): Promise<DocumentList>;
  getDocument(id: string): Promise<AppState["document"]>;
  createDocument(doc: CreateDocument): Promise<void>;
}

export interface UseApiResult {
  api: ApiClient;
  isLoggedIn: boolean;
}

/** cache keyed by baseUrl */
const apiPerConfigCache = new Map<string, { api: ApiClient; token: string | undefined }>();

const defaultLocalApiState = Object.freeze({
  documents: undefined as DocumentList | undefined,
  token: undefined as string | undefined,
});

const initialLocalApiState = Object.freeze({
  ...defaultLocalApiState,
  token: localStorage.getItem(authv1key) ?? undefined,
});

interface Actions {
  get isLoggedIn(): boolean;
}

export const useLocalApiState = create<typeof initialLocalApiState & Actions>()((_set) => ({
  ...initialLocalApiState,
  get isLoggedIn() { return this.token !== undefined; },
}));

/**
 * @note: memoized by baseUrl, stores the token in javascript atm which should be removed
 */
export function useApi({
  // FIXME: change this dynamically between prod and development?
  // (use vite's import.meta.env)
  baseUrl = `http://${window.location.hostname}:4222/api/v1`,
} = {}): Omit<UseApiResult, "token"> {
  let cached = apiPerConfigCache.get(baseUrl);

  const localApiState = useLocalApiState();

  const setToken = (newVal: string | undefined) => {
    assert(cached);
    cached.token = newVal;
    // FIXME: use an http only cookie instead to store the jwt client side
    if (newVal) localStorage.setItem(authv1key, newVal);
    else localStorage.removeItem(authv1key);
    useLocalApiState.setState({ token: newVal });
  };

  if (cached === undefined) {
    const apiFetch = (subpath: string, reqOpts: RequestInit = {}) => {
      assert(subpath.startsWith("/"));
      return fetch(`${baseUrl}${subpath}`, {
        ...reqOpts,
        headers: {
          ...cached!.token && {'Authorization': `Bearer ${cached!.token}`},
          ...reqOpts.headers,
        },
      });
    }

    async function likeLogin(subpath: "register" | "login", user: RegisterUserData) {
      const resp = await apiFetch(`/users/me/${subpath}`, {
        method: "POST",
        body: JSON.stringify(user),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const respJson = await resp.json();
      assert(respJson?.token, "no token in login response");
      setToken(respJson.token as string);
    }

    // FIXME: use a local zustand store optimistically?
    cached = {
      token: localStorage.getItem(authv1key) ?? undefined,
      api: {
        register: (user: RegisterUserData) => likeLogin("register", user),
        login: (user: RegisterUserData) => likeLogin("login", user),

        async logout() {
          setToken(undefined);
          // FIXME: logout on the backend
        },

        async getMyUser() {
          return apiFetch("/users/me").then((r) => r.json());
        },

        async getMyDocumentList() {
          return apiFetch("/users/me/documents").then((r) => r.json());
        },

        async getDocument(id: string): Promise<AppState["document"]> {
          return apiFetch(`/users/me/documents/${id}`).then((r) => r.json());
        },

        async createDocument(doc: CreateDocument) {
          //const { CompressionStream } = await polyfills.getCompressionStreamImpl();

          // const docBlob = new Blob([JSON.stringify(doc)]);
          // const compressedDocument = docBlob.stream().pipeThrough(
          //   new CompressionStream('gzip')
          // );

          await apiFetch(`/users/me/documents`, {
            method: "POST",
            body: JSON.stringify(doc),
            //headers: {
              //'Content-Type': 'application/octet-stream',
            //},
          }).then((r) => r.json());
        },
      },
    };

    apiPerConfigCache.set(baseUrl, cached);
  }

  // FIXME: I need to memoize this don't I...
  return useMemo(() => ({
    ...cached!,
    isLoggedIn: localApiState.isLoggedIn,
  }), [localApiState.isLoggedIn]);
}
