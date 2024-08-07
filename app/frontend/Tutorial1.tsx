import React from "react";
import { Tutorial, TutorialData } from "./components/Tutorial";
import * as ProjectDataEditor from "./ProjectDataEditor";
import { create } from "zustand";

const hasSeenTutKey = "alternis-v1_hasSeenIntroTutorial1";
const hasSeenTutorial = localStorage.getItem(hasSeenTutKey) === "true";

export interface TutorialState {
  tutorialOpen: boolean;
}

// FIXME: do real query param parsing!
const noTutorialRequested = window.location.search.includes("noTutorial");


export const useTutorialStore = create<TutorialState>(() => ({
  tutorialOpen: !hasSeenTutorial && !noTutorialRequested,
}));

const tutorial1Data: TutorialData = {
  name: "Tutorial",
  steps: [
    {
      body: <p>Welcome to Alternis, would you like to be shown around?</p>,
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>We try to put tooltips on most stuff, so hover over most things to learn more.</p>
      </div>,
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          On the left is the side panel.
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
        <p>
          You can also drag and drop the portraits into the graph to create
          a <em>line</em> node in the dialogue, said by that participant.
        </p>
      </div>,
      highlightedTutIds: ["participant-add-button"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("variables");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Variables are values in the dialogue that can change during the dialogue.
          Mostly:
        </p>
        <ul>
          <li>values set by the environment at startup time</li>
          <li>values changed when you call a <em>function</em> from the environment</li>
          <li>true/false (boolean) values locked (set false) or unlocked (set true) by lock nodes</li>
        </ul>
        <p>
          You can add new ones to expose to the environment, or to use when locking
          dialogue paths.
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
          A bit more about variables.
        </p>
        <p>
          You can drag and drop <em>text</em> type variables
          onto <em>line</em> and <em>reply</em> nodes to add them
          to the text.
        </p>
        <p>
          But it's usually easier to just type <code>{"{variable name}"}</code> manually.
        </p>
        <p>
          You can drag and drop <em>true/false</em> (boolean) variables into the graph
          to spawn a <em>lock/unlock</em> node that locks or unlocks that variable when reached.
        </p>
      </div>,
      highlightedTutIds: ["generic-proj-data-add-button"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("functions");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Functions are events that must be handled by the environment.
        </p>
        <p>
          For instance, if a function is reached, the environment may ask the user for
          some input and set a variable which will be used later in the dialogue.
        </p>
        <p>
          Functions are handled entirely by the configuration of the Alternis Engine,
          Please refer to the (non-yet-existent) <a href="/FIXME">Alternis Engine developer
          documentation</a> for how to use it in a particular environment.
          Often there is a plugin, if not,
          feel free to contact <a href="mailto:support@alternis.io">support@alternis.io</a>.
        </p>
        <p>
          Drag and drop a function name to create a <em>call</em> node that calls that function.
        </p>
      </div>,
      highlightedTutIds: ["generic-proj-data-add-button"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("preferences");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Preferences are not project-specific, they are general things you
          can change about the editor to your liking, such as which mouse button
          lets you pan the graph.
        </p>
      </div>,
      highlightedTutIds: ["preferences"],
    },
    {
      onReached() {
        ProjectDataEditor.setOpenDataPane("dialogues");
      },
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          You can have multiple dialogues. You can add new ones and switch between which one
          you are editing under the "dialogues" tab.
        </p>
      </div>,
      highlightedTutIds: ["dialogues-content"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Now that we're done looking at the side panel, let's look at the graph.
        </p>
        <p>
          You can control/command right-click (change in preferences) to
          bring up a menu of node types to add. Then you can play with the inputs on each
          node to alter them.
        </p>
        <p>
          You may also select nodes with left-click-drag to box select or regular click
          and press backspace/return to delete them. You can add nodes to your selection
          with control/command held while clicking (change in preferences).
        </p>
      </div>,
      highlightedTutIds: ["graph"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Nodes lead to each other.
        </p>
        <p>
          Click one <em>handle</em> coming out of a node (on its right), and then click another coming
          into one (its left), to connect them. You can also drag from one to the other.
        </p>
        <p>
          Click on any <em>link</em> between two nodes to delete that link.
        </p>
      </div>,
      highlightedTutIds: ["node-handle"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          Some nodes have multiple possible outcomes, namely the <em>random switch</em> and
          the <em>reply</em> nodes.
        </p>
        <p>
          The random switch node lets you assign the probability of multiple outcomes.
          The percent is calculated for you, you just assign the count out of total chances,
          Try playing with it, we think it's very fast to get used to.
        </p>
      </div>,
      highlightedTutIds: ["node-random-switch"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          The <em>reply</em> node tells the dialogue engine that the environment will let
          one of the participants choose a response.
        </p>
        <p>
          Typically this means the environment
          will present a user with an interface to select between multiple options, and
          the dialogue will go down the path they choose.
        </p>
        <p>
          The icon to the right of the input is the <em>lock status</em> of a reply. You may choose
          to always enable a reply, or <em>lock</em> or <em>unlock</em> a reply on some true/false variable.
          This way, that reply won't be usable until some <em>lock</em> node is reached.
        </p>
      </div>,
      highlightedTutIds: ["node-reply"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          The <em>lock</em> node either <em>locks</em> (sets false)
          or <em>unlocks</em> (sets true) a boolean variable. You can lock
          replies in a <em>reply</em> node on those variables.
        </p>
        <p>
          Right-click a <em>lock</em> node to toggle between locking and unlocking.
        </p>
        <p>
          With locks, you can make future dialogue vary based on what has already been said.
        </p>
      </div>,
      highlightedTutIds: ["node-lock"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          The <em>call</em> node calls a <em>function</em> from the environment.
        </p>
        <p>
          The environment can do whatever it wants before continuing (or not) the dialogue,
          even changing variables that you can then use.
        </p>
      </div>,
      highlightedTutIds: ["node-function"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        {/* FIXME: add some kind of wiki and links, and bold instead italics for node names */}
        <p>
          The <em>goto</em> node redirects the dialogue state to some labeled node.
        </p>
        <p>
          You can set a label for a label-able node by clicking the <em>more</em> arrow of label-able nodes,
          and editing the label to not be empty.
        </p>
        <p>
          This is a good way to bring a user back to a list of possible interogation options, and see newly unlocked
          dialogue paths.
        </p>
      </div>,
      highlightedTutIds: ["node-goto", "node-more"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          You can use the playback controls to run through your dialogue and test it out.
        </p>
        <p>
          <strong>
            FIXME:
            There is not yet a way to set values for variables, but there will be
          </strong>
        </p>
      </div>,
      highlightedTutIds: ["dialogue-playback"],
    },
    // FIXME: need a section on the debugger
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          When you're ready to test your conversation in your environment, press the <em>export</em> button
          to download the <code>.alternis</code> file which can be loaded by your environment's Alternis
          integration.
        </p>
      </div>,
      highlightedTutIds: ["export-button"],
    },
    {
      body: <div style={{ maxWidth: "400px" }}>
        <p>
          And that's all! I can't believe you made it all the way to the end of this tutorial.
        </p>
        <p>
          {/* FIXME: need a forum so people won't just say the same thing someone else has said */}
          Please contact <a href="mailto:support@alternis.io">support@alternis.io</a> if you
          encounter any issues!
        </p>
      </div>,
    },
  ],
};

export function Tutorial1() {
  const tutorialState = useTutorialStore();

  return tutorialState.tutorialOpen
    ? <Tutorial
        data={tutorial1Data}
        onClose={() => { localStorage.setItem(hasSeenTutKey, "true"); }}
      />
    : null;
}

