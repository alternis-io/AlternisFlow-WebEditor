import { run } from "./api";
import dotenv from "dotenv";

dotenv.config();

// FIXME: generate from .env template
const requiredEnvVars = [
  // TODO: these aren't required in the intended feature set for now
  //"GITHUB_CLIENT_ID",
  //"GITHUB_CLIENT_SECRET",
];

for (const _var of requiredEnvVars)
  if (process.env[_var] === undefined)
    throw Error(`required env var '${_var}' is missing!`);

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_CLIENT_ID: string;
      GITHUB_CLIENT_SECRET: string;
    }
  }
}

void run();
