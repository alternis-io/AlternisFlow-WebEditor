import { DbConn } from '.';

/**
 * initialize the connection,
 * mostly by making sure the database has the appropriate schemas
 */
export async function init(conn: DbConn) {
  await conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      name TEXT
    );
  `);

  // check columns
}
