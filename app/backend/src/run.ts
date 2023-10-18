import { run } from "./api";
import dotenv from "dotenv";

dotenv.config();

// FIXME: generate from .env template
const requiredEnvVars = [
  "GITHUB_CLIENT_ID"
];

for (const _var of requiredEnvVars)
  if (process.env[_var] === undefined)
    throw Error(`required env var '${_var}' is missing!`);

void run();
