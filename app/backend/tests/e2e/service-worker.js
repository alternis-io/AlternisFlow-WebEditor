/**
 * @typedef {Object | undefined} WorkerData
 * @property {number | undefined} port
 */

/** @type {{ workerData: WorkerData }} */
const { workerData, parentPort } = require("worker_threads");

const Service = require("../..");

void Service.run(workerData ?? {})
  .then(() => {
    parentPort.postMessage("ready");
  })
  .catch((err) => {
    console.error(err);
    throw err;
  });
