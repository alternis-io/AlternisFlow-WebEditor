import { DbConn } from '.';

// FIXME: rename this, it should be like "provision" or "ensureSchema"
/**
 * initialize the connection,
 * mostly by making sure the database has the appropriate schemas
 */
export async function init(conn: DbConn) {
  await conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      -- might be an OTP
      login_credential TEXT NOT NULL,
      login_credential_expiry INTEGER DEFAULT (julianday('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY,
      owner INTEGER,
      name TEXT NOT NULL UNIQUE,
      json_contents TEXT,
      -- NOTE: created_from FOREIGN KEY CASCADE NULL,
      FOREIGN KEY (owner) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY,
      message TEXT NOT NULL,
      stack TEXT NOT NULL,
      context TEXT NOT NULL,
      client_version TEXT NOT NULL,
      backend_version TEXT NOT NULL,
      count INTEGER DEFAULT (1),
      UNIQUE(message, stack, context, client_version, backend_version)
    );

    CREATE TABLE IF NOT EXISTS feature_tracking (
      id INTEGER PRIMARY KEY,
      feature TEXT NOT NULL,
      context TEXT NOT NULL,
      count INTEGER DEFAULT (1),
      UNIQUE(feature, context)
    );
  `);

  // check columns
}
