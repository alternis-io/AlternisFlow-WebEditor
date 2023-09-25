import { AppState } from "../AppState";
import { assert } from "js-utils/lib/browser-utils";
//import * as polyfills from "../polyfills";
import type { CreateDocument, RegisterUserData, User } from "dialogue-middleware-app-backend/lib/prisma";
import { useMemo, useState } from "react";

const authv1Cookie = "authv1_tok";

function parseCookieAttrs(cookie = document.cookie): Record<string, string> {
  return Object.fromEntries(
    cookie
      .split(/;\s*/g)
      .map(pair => pair.split('='))
  );
}

function stringifyCookieAttrs(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function setCookieAttr(cookie: string, key: string, value: string): string {
  const fields = parseCookieAttrs(cookie);
  fields[key] = value;
  return stringifyCookieAttrs(fields);
}

export interface ApiClient {
  register: (user: RegisterUserData) => Promise<void>;
  login: (user: RegisterUserData) => Promise<void>;
  getMyUser(): Promise<User>;
  getMyDocumentList(): Promise<Response>;
  getDocument(id: string): Promise<AppState["document"]>;
  createDocument(doc: CreateDocument): Promise<void>;
}

export interface UseApiResult {
  api: ApiClient;
  isLoggedIn: boolean;
}

/** cache keyed by baseUrl */
const apiPerConfigCache = new Map<string, { api: ApiClient; token: string | undefined }>();

/**
 * @note: memoized by baseUrl, stores the token in javascript atm which should be removed
 */
export function useApi({
  // FIXME: change this dynamically between prod and development?
  // (use vite's import.meta.env)
  baseUrl = "http://localhost:4222/api/v1",
} = {}): Omit<UseApiResult, "token"> {
  let cached = apiPerConfigCache.get(baseUrl);

  const [isLoggedIn, setIsLoggedIn] = useState(cached?.token !== undefined);

  const setToken = (newVal: string | undefined) => {
    assert(cached);
    cached.token = newVal;
    // FIXME: use an http only cookie instead to store the jwt client side
    if (newVal) localStorage.setItem(authv1Cookie, newVal);
    else localStorage.removeItem(authv1Cookie);
    setIsLoggedIn(newVal !== undefined);
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
      token: localStorage.getItem(authv1Cookie) ?? undefined,
      api: {
        register: (user: RegisterUserData) => likeLogin("register", user),
        login: (user: RegisterUserData) => likeLogin("login", user),

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
    isLoggedIn,
  }), [isLoggedIn]);
}
