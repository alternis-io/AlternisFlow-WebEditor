/**
 * Spawn the service on another thread for e2e tests to use
 */

import { Worker } from "node:worker_threads";

const service_main = require.resolve("./service-worker");

let worker: Worker;

export const API_TEST_SCHEME = "http";
export const API_TEST_PORT = 4001;
export const API_TEST_BASE_URL = `${API_TEST_SCHEME}://localhost:${API_TEST_PORT}`;

export async function mochaGlobalSetup() {
  console.log("setup!")
  worker = new Worker(service_main, { workerData: { port: API_TEST_PORT } });
  await new Promise(resolve, worker.on("message", (msg) => {
    if (msg === "ready") resolve();
  }));
}

export async function mochaGlobalTeardown() {
  await worker.terminate();
}

