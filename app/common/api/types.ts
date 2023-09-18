export interface Authed {
  loginCredential: string;
}

export interface Document {
  id: string;
  name: string;
  jsonContents: string | null;
}

export type DocumentPost = Omit<Document, "id">;


export type DocumentList = {
  id: number;
  name: string;
}[];

// FIXME: rename
export interface IdRequest {
  id: number;
}

export interface User {
  id: number;
  email: string;
}

