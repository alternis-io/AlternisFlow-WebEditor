import * as express from 'express';
import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
const app = express()
const port = Number(process.env.PORT) || 3000;

async function connect() {
  const db = await sqlite.open({
    filename: '/tmp/database.db',
    driver: sqlite3.Database
  });
  /*
  await db.exec(`
    CREATE TABLE users (name TEXT)
  `);
  */
  return db;
}

async function main() {
  const db = await connect();

  app.get('/', (req, res) => {
    //res.send('Hello World!')
    db.get("SELECT * FROM users").then(data => {
      res.send(JSON.stringify(data));
      res.end();
    });
  })

  app.post('/', (req, res) => {
    //res.send('Hello World!')
    db.exec("INSERT INTO users VALUES ('blah')").then(() => {
      res.end();
    });
  })

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}

main();

