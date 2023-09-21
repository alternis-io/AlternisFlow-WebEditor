import { AppState } from "./AppState";
import { Document } from "../common/api/types";
//import * as polyfills from "./polyfills";
import type { User } from "dialogue-middleware-app-backend/lib/backend/src"

export function useApi({
  // FIXME: change this dynamically between prod and development?
  baseUrl = "http://localhost:4222",
} = {}) {
  // FIXME: use a local zustand store optimistically?
  return {
    async registerUser() {
      await fetch(`${baseUrl}/users/me`, { method: "POST" });
    },

    async requestLogin() {
      await fetch(`${baseUrl}/users/me/login/request`);
    },

    async finishLogin() {
      await fetch(`${baseUrl}/users/me/login/confirm`);
    },

    async getMyUser() {
      await fetch(`${baseUrl}/users/me`);
    },

    async getMyDocumentList() {
      return fetch(`${baseUrl}/users/me/documents`);
    },

    async getDocument(id: string): Promise<AppState> {
      await fetch(`${baseUrl}/users/me/documents/${id}`)
    },

    async createDocument(doc: Document) {
      //const { CompressionStream } = await polyfills.getCompressionStreamImpl();

      // const docBlob = new Blob([JSON.stringify(doc)]);
      // const compressedDocument = docBlob.stream().pipeThrough(
      //   new CompressionStream('gzip')
      // );

      await fetch(`${baseUrl}/users/me/documents`, {
        method: "POST",
        body: JSON.stringify(doc),
        headers: {
          'Content-Type': 'application/octet-stream',
        }
      });
    },
  };
}
