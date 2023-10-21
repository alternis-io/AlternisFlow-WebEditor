import type express from "express";
import { requireGoogleAuthToken } from "./google/auth";

export interface AuthUserInfo {
  /** available when using alternis issuer */
  id?: number;
  email: string;
}

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUserInfo;
      token?: string;
    }
  }
}

// currently only allowing google, eventually this can dispatch to supported validators
// based on issuers
export const requireAuthToken = requireGoogleAuthToken;

