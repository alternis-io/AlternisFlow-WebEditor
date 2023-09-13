import React, { useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { Node, Edge } from 'reactflow'
import { assert } from "./browser-utils";
import { Participant } from "../common/data-types/participant";
import { deepCloneJson, makeInaccessibleObject } from "./react-utils";
import { useStable } from "@bentley/react-hooks";
import { StateCreator, StoreMutatorIdentifier, create } from "zustand";

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

// FIXME: move to different file
export function makeLocalStorageSynchronizedObject<T extends {[k: string]: any}>(defaultData: T) {
  const subscriptions = new Set<() => void>();

  return {
    object: new Proxy({} as T, {
      get(obj: T, key, recv) {
        assert(typeof key === "string", "locally stored object had non-string key");
        if (!(key in obj)) {
          const persisted = localStorage.getItem(key);
          obj[key as keyof T] = persisted
            ? JSON.parse(persisted)
            : defaultData[key];
        }
        return Reflect.get(obj, key, recv);
      },
      set(obj, key, value, recv) {
        assert(typeof key === "string", "locally stored object had non-string key");
        localStorage.setItem(key, JSON.stringify(value));
        const result = Reflect.set(obj, key, value, recv)
        subscriptions.forEach(s => s())
        return result;
      }
    }),
    subscribe: (f: () => void) => {
      subscriptions.add(f);
      return function unsubscribe() { subscriptions.delete(f); };
    },
  };
}

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
