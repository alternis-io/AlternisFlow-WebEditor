import { AppState } from "./AppState";

export function useApi({
  // FIXME: change this dynamically between prod and development?
  baseUrl = "http://localhost:4222",
}) {
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

    async createDocument() {
      await fetch(`${baseUrl}/users/me/documents`, { method: "POST" });
    },
  };
}
