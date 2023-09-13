
import React from "react";
import ReactDOM from "react-dom";
import Ide from "./Ide";
import './userWorker';
import { ReactFlowProvider } from "reactflow";
import { AppStateProvider } from "./AppState";
//import { NoderProvider } from "./NoderContext";

ReactDOM.render(
  //<NoderProvider>
  <AppStateProvider>
    <ReactFlowProvider>
      <Ide />
    </ReactFlowProvider>
  </AppStateProvider>,
  //</NoderProvider>,
  document.querySelector("#react-app")
);
