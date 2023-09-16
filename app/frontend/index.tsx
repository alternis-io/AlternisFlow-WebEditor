
import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";

ReactDOM.render(
  //<NoderProvider>
    <ReactFlowProvider>
      <Ide />
    </ReactFlowProvider>,
  //</NoderProvider>,
  document.querySelector("#react-app")
);
