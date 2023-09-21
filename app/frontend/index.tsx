import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { createHashRouter, RouterProvider } from "react-router-dom";

const router = createHashRouter([
  {
    path: "/",
  }
]);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <ReactFlowProvider>
      <Ide />
    </ReactFlowProvider>
  </React.StrictMode>,
  document.querySelector("#react-app")
);
