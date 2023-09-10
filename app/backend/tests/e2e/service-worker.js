/**
 * @typedef {Object | undefined} WorkerData
 * @property {number | undefined} port
 */

/** @type { WorkerData } */
const { workerData } = require("worker_threads");

const Service = require("../..");

void Service.run(workerData);
