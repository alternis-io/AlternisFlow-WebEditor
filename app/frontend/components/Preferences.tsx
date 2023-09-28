import React, { useEffect } from "react";
import styles from "./Ide.module.css";
import { AppState, KeyModifiers, MouseButtons, MouseInteractions, clientIsLinux, clientIsMac, useAppState }  from "../AppState";

type GraphPrefs = AppState["preferences"]["graph"]

const mouseInteractionLabels: Record<keyof typeof MouseInteractions, string> = {
  "Left": "left mouse click",
  "Middle": "middle mouse click",
  "Right": "right mouse click",
  "DoubleClick": "double click",
};

const modifierKeyLabels: Record<keyof typeof KeyModifiers, string> = {
  "Alt": "alt key",
  "Control": "ctrl key",
  "Meta": clientIsMac
    ? "command key"
    : clientIsLinux
    ? "meta key"
    : "windows key",
  "Shift": "shift key",
};

type ValueTypeSubset<T extends object, V> = {
  [K in keyof T]: T[K] extends V ? T[K] : never;
}

const makeEnumSelectComponent = <E extends object>(
  stateKey: keyof ValueTypeSubset<GraphPrefs, E[keyof E]>,
  enum_: E,
  labels: Record<keyof E, string>
) => {
  const options = Object.entries(enum_).map(([k, v]) => (
    <option key={k} value={(console.log(k, v), JSON.stringify(v))}>{labels[k]}</option>
  )).concat(
    <option key="null" value={JSON.stringify(null)}>none</option>
  );

  return () => {
    const setting = useAppState(s => s.preferences.graph[stateKey]);
    return (
      <select
        value={JSON.stringify(setting)}
        onChange={(e) => useAppState.setState(s => ({
          preferences: {
            ...s.preferences,
            graph: {
              ...s.preferences.graph,
              [stateKey]: JSON.parse(e.currentTarget.value),
            },
          },
        }))}
      >
        {options}
      </select>
    );
  };
}

const DragPanMouseBindingSetting = makeEnumSelectComponent("dragPanMouseBinding", MouseButtons, mouseInteractionLabels);
const DragBoxSelectMouseBindingSetting = makeEnumSelectComponent("dragBoxSelectMouseBinding", MouseButtons, mouseInteractionLabels);
const AppendToSelectModifierSetting = makeEnumSelectComponent("appendToSelectModifier", KeyModifiers, modifierKeyLabels);
const AddNodeMouseBindingSetting = makeEnumSelectComponent("addNodeMouseBinding", MouseInteractions, mouseInteractionLabels);

export function Preferences() {
  return (
    <div>
      <label title="Which mouse button you can click and drag to move around the graph" className="split">
        <span>
          Pan graph method
        </span>
        <DragPanMouseBindingSetting />
      </label>

      <label title="Which mouse button you can click and drag to start a box selection of graph elements" className="split">
        <span>
          Box select nodes method
        </span>
        <DragBoxSelectMouseBindingSetting />
      </label>

      <label title="Which modifier key you can hold to add to selection instead of starting a new one " className="split">
        <span>
          Append to selection key
        </span>
        <AppendToSelectModifierSetting />
      </label>

      <label title="Which mouse button" className="split">
        <span>
          Add node method
        </span>
        <AddNodeMouseBindingSetting />
      </label>
    </div>
  );
}

