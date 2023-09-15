import type { Node, Edge } from 'reactflow'
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "./react-utils";
import { create } from "zustand";
import { DeepPartial } from "ts-essentials/dist/deep-partial";
import defaultParticipantIconUrl from "./resources/participant-icon.svg";

// FIXME: move out icon data and get type from that list
export type IconSizes = "small" | "medium" | "large";

// prepopulate during loading...
const testParticipants = new Array(100).fill(undefined).map((_, i) => ({
    name: `test_${i}`,
    portraitUrl:defaultParticipantIconUrl,
}));

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
      type: 'entry',
      position: { x: 540, y: 100 },
    }] as Node<{}>[],
    edges: [] as Edge<{}>[],
    participants: testParticipants as Participant[],
    constants: {} as {
      [name: string]: number | string | boolean,
    },
    gates: {} as {
      [name: string]: {
        initial: "locked" | "unlocked"
      },
    },
    events: [] as string[],
  },
};

export type AppState = typeof defaultAppState;

const appStateKey = "appState";

const initialState: AppState = (() => {
  let maybeLocallyStoredState: AppState | undefined;
  try {
    const localState = localStorage.getItem(appStateKey);
    if (localState !== null)
      maybeLocallyStoredState = JSON.parse(localState);
  } catch {}
  return maybeLocallyStoredState ?? deepCloneJson(defaultAppState);
})();

type SettableState<T extends object> = T & {
  set(
    cb: (s: T) => DeepPartial<T> | Promise<DeepPartial<T>>,
  ): void;
};

export const useAppState = create<SettableState<AppState>>((set) => ({
  ...initialState,
  set: set as SettableState<AppState>["set"],
}));

useAppState.subscribe((state) =>
  localStorage.setItem(appStateKey, JSON.stringify(state))
);

export function resetAllAppState() {
  useAppState.setState(deepCloneJson(defaultAppState));
}
