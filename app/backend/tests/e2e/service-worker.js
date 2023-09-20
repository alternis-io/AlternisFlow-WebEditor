/**
 * @typedef {Object | undefined} WorkerData
 * @property {number | undefined} port
 */

/** @type {{ workerData: WorkerData }} */
const { workerData, parentPort } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

// use a test-only empty db for these tests
const testDbPath = path.join(__dirname, "./test.db");
try { fs.unlinkSync(testDbPath); } catch {}
process.env.DATABASE_URL = `file:${testDbPath}`;

console.log("resetting test.db for e2e tests");
child_process.execFileSync(
  path.join(__dirname, "../../node_modules/.bin/prisma"),
  ["migrate", "reset", "--force"],
  {
    stdio: "inherit"
  }
);

const Service = require("../..");

void Service.run(workerData ?? {})
  .then(() => {
    parentPort.postMessage("ready");
  })
  .catch((err) => {
    console.error(err);
    throw err;
  });
