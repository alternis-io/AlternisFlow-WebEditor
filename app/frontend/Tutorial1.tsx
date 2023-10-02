import React, { useEffect } from "react";
import { Tutorial, TutorialData } from "./components/Tutorial";
import { useLocation } from "react-router-dom";

const hasSeenTutKey = "alternis-v1_hasSeenIntroTutorial1";
const hasSeenTutorial = localStorage.getItem(hasSeenTutKey) === "true";

const tutorial1Data: TutorialData = {
  name: "Tutorial",
  steps: [
    {
      body: <p>Welcome to alternis, would you like to be shown around?</p>,
      showEarlyCloseButton: true,
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          On the left is the details pane.
          Here you can edit your project data, or editor preferences.
        </p>
        <p>
          We will now go through each editor
        </p>
      </div>,
      highlightedTutIds: ["project-data-editor"]
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

