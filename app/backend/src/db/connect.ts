import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as db from '.';

export async function connect() {
  const conn = await sqlite.open({
    filename: '/tmp/database.db',
    driver: sqlite3.Database
  });
  db.init(conn);
  return conn;
}
