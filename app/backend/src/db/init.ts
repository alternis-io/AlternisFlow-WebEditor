import { DbConn } from '.';

// FIXME: rename this, it should be like "provision" or "ensureSchema"
/**
 * initialize the connection,
 * mostly by making sure the database has the appropriate schemas
 */
export async function init(conn: DbConn) {
  await conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      json_contents TEXT
      -- created_from FOREIGN KEY CASCADE NULL -- possible
    );
  `);

  // check columns
}
