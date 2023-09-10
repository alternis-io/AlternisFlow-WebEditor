import * as Service from "../..";
import { workerData as untypedWorkerData } from "worker_threads";

export type WorkerData = undefined | {
  port?: number;
};

const workerData = untypedWorkerData as WorkerData;

void Service.run(workerData);
