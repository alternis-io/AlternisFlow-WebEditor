import React, { useEffect } from "react";
import { Tutorial, TutorialData } from "./components/Tutorial";
import { useLocation } from "react-router-dom";
import * as ProjectDataEditor from "./ProjectDataEditor";

const hasSeenTutKey = "alternis-v1_hasSeenIntroTutorial1";
const hasSeenTutorial = localStorage.getItem(hasSeenTutKey) === "true";

const tutorial1Data: TutorialData = {
  name: "Tutorial",
  steps: [
    {
      body: <p>Welcome to Alternis, would you like to be shown around?</p>,
      showEarlyCloseButton: true,
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          On the left is the details pane.
          Here you can edit your project data, or editor preferences.
        </p>
        <p>
          We will now go through each tab.
        </p>
      </div>,
      highlightedTutIds: ["project-data-editor"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("participants");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          In the participants tab, you can press the add button
          to add a participant, or click on a portrait to edit one.
        </p>
      </div>,
      highlightedTutIds: ["generic-proj-data-add-button"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("variables");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Variables are states in the dialogue.
          These most often hold either:
        </p>
        <ul>
          <li>values set by the environment at startup time</li>
          <li>values changed when you call a <em>function</em> in the environment</li>
          <li>boolean (true/false) values locked (set false) or unlocked (set true) by lock nodes</li>
        </ul>
        <p>
          You can add them and change their types to expose to the environment, or to use when locking
          dialogue paths.
        </p>
      </div>,
      highlightedTutIds: ["participant-add-button"],
    },
  ],
};

export function Tutorial1() {
  const location = useLocation();

  // FIXME: do real query param parsing!
  const noTutorialRequested = location.search.includes("noTutorial");

  return hasSeenTutKey && !noTutorialRequested
    ? <Tutorial
        data={tutorial1Data}
        onClose={() => { localStorage.setItem(hasSeenTutKey, "true"); }}
      />
    : null;
}

