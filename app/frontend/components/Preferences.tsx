import React, { useEffect } from "react";
import styles from "./Ide.module.css";
import { AppState, KeyModifiers, MouseButtons, MouseInteractions, clientIsLinux, clientIsMac, useAppState }  from "../AppState";
import { MouseBinding, MouseBindingInput } from "./KeyBindingInput";

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
    <option key={k} value={JSON.stringify(v)}>{labels[k]}</option>
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

const AppendToSelectModifierSetting = makeEnumSelectComponent("appendToSelectModifier", KeyModifiers, modifierKeyLabels);

function useBindingSetting<K extends keyof GraphPrefs>(key: K) {
  const binding = useAppState(s => s.preferences.graph[key]);
  // NOTE: if expanding this, it should support Partial
  const setBinding = (val: GraphPrefs[K] | ((prev: GraphPrefs[K]) => GraphPrefs[K])) => useAppState.setState(s => ({
    preferences: {
      ...s.preferences,
      graph: {
        ...s.preferences.graph,
        [key]: typeof val === "function" ? val(s.preferences.graph[key]) : val,
      },
    },
  }));

  return { binding, setBinding };
}

export function Preferences() {
  const dragPanMouseBinding = useBindingSetting("dragPanMouseBinding");
  //const dragBoxSelectMouseBinding = useBindingSetting("dragBoxSelectMouseBinding");
  const addNodeBinding = useBindingSetting("addNodeMouseBinding");
  const enableBoxSelectOnDrag = useBindingSetting("enableBoxSelectOnDrag");

  console.log(enableBoxSelectOnDrag.binding);

  return (
    <div>
      <label title="Which mouse button you can click and drag to move around the graph" className="split">
        <span>
          Pan graph method
        </span>
        <MouseBindingInput value={dragPanMouseBinding.binding} onChange={dragPanMouseBinding.setBinding} ignoreModifiers />
      </label>

      <label
        title={"If on, click and drag to start a box selection of graph elements.\n"
             + "We are working on supporting more than just left mouse"}
        className="split"
      >
        <span>
          Turn on box select on left mouse drag
        </span>
        <input type="checkbox"
          checked={enableBoxSelectOnDrag.binding || false}
          onChange={() => enableBoxSelectOnDrag.setBinding(p => !p)}
        />
      </label>

      <label title="Which modifier key you can hold to add to selection instead of starting a new one " className="split">
        <span>
          Append to selection modifier
        </span>
        <AppendToSelectModifierSetting />
      </label>

      <label title="Which mouse button (with modifiers e.g. shift) allow to add a node after" className="split">
        <span>
          Add node key binding
        </span>
        <MouseBindingInput value={addNodeBinding.binding} onChange={addNodeBinding.setBinding} />
      </label>
    </div>
  );
}

