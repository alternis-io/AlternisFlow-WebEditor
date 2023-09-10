import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';

export type DbConn = sqlite.Database<sqlite3.Database, sqlite3.Statement>;

export * from "./init";
export * from "./connect";

