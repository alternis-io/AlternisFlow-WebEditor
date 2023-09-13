import type { Node, Edge } from 'reactflow'
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "./react-utils";
import { create } from "zustand";

// FIXME: move to common/
export interface DialogueEntry {
  portrait?: string
  title: string
  text: string
}

export interface DialogueEntryNodeData extends DialogueEntry {
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<DialogueEntry>): void
  onDelete(): void
}

// FIXME: move out icon data and get type from that list
export type IconSizes = "small" | "medium" | "large";

// prepopulate during loading...
const testParticipants: Record<string, Participant> = Object.fromEntries(new Array(100).fill(undefined).map((_, i) => ([
  `test_${i}`,
  {
    name: `test_${i}`,
    // FIXME: make my own
    portraitUrl: "https://www.svgrepo.com/show/166448/portrait.svg"
  }
])));

const defaultAppState = {
  preferences: {
    participantEditor: {
      iconSize: "medium",
      lastSelected: undefined as undefined | string,
    },
  },

  document: {
    nodes: [{
      id: '1',
      type: 'input',
      data: {
        label: 'entry',
      },
      position: { x: 540, y: 100 },
    }] as Node<{}>[],
    edges: [] as Edge<{}>[],
    participants: testParticipants as { [k: string]: Participant },
  }
};

export type AppState = typeof defaultAppState;

const appStateKey = "appState";

const initialState = (() => {
  let maybeLocallyStoredState: AppState | undefined;
  try {
    maybeLocallyStoredState = JSON.parse(localStorage.get(appStateKey));
  } catch {}
  return maybeLocallyStoredState ?? deepCloneJson(defaultAppState);
})();

export const useAppState = create<AppState>((set) => ({
  ...initialState,
  set,
}));

useAppState.subscribe((state) =>
  localStorage.setItem(appStateKey, JSON.stringify(state))
);
