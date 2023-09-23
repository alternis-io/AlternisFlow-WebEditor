import type { Node, Edge } from 'reactflow'
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "js-utils/lib/react-utils";
import { create } from "zustand";
import { DeepPartial } from "ts-essentials/dist/deep-partial";

// FIXME: move out icon data and get type from that list
export type IconSizes = "small" | "medium" | "large";

export const defaultAppState = {
  preferences: {
    participantEditor: {
      iconSize: "medium" as IconSizes,
      lastSelected: undefined as undefined | string,
    },
  },

  projectId: undefined as string | undefined,

  // TODO: document should be optional...
  document: {
    nodes: [{
      id: '1',
      type: 'entry',
      position: { x: 540, y: 100 },
    }] as Node<{}>[],
    edges: [] as Edge<{}>[],
    participants: [] as Participant[],
    variables: {} as {
      [name: string]: {
        type: "number" | "string" | "boolean",
        default: string,
      },
    },
    // FIXME: remove, no longer used
    gates: {} as {
      [name: string]: {
        initial: "locked" | "unlocked"
      },
    },
    functions: {} as {
      [name: string]: {},
    },
  },
};

Object.freeze(defaultAppState);

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
  /** @deprecated, just use useAppState.setState */
  set(
    cb: (s: T) => DeepPartial<T> | Promise<DeepPartial<T>>,
  ): void;
  undo(): void;
  redo(): void;
};

const UNDO_LIMIT = 1024;
/** distance from last index, reset upon new history
 * really a 0-index starting from the last elem, backwards
 */
let undoDepth = 0;
// HACK: there's probably a better way... is this even guaranteed anyway?
let historyManipKind: undefined | "undo" | "redo";
const undoStack: AppState[] = [];

export const useAppState = create<SettableState<AppState>>((set) => ({
  ...initialState,
  set: set as SettableState<AppState>["set"],
  undo: () => {
    undoDepth--;
    if (-undoDepth > undoStack.length) {
      undoDepth = -(undoStack.length - 1);
      return;
    } else {
      historyManipKind = "undo";
      set(undoStack[undoStack.length + undoDepth]);
      historyManipKind = undefined;
    }
  },
  redo: () => {
    undoDepth++;
    if (undoDepth > 0) undoDepth = 0;
    historyManipKind = "redo";
    set(undoStack[undoStack.length + undoDepth]);
    historyManipKind = undefined;
  }
}));

// NOTE: consider making the undo stack implicitly updated by the store's exposed setter,
// rather than as a side effect...

// NOTE: should skip some kinds of updates, and focus the required UI for other kinds
useAppState.subscribe((state) => {
  if (historyManipKind)
    return;

  // new changes destroy the "undone" segment of the stack, no redos
  undoStack.length = undoStack.length + undoDepth;

  undoStack.push(state);

  if (undoStack.length > UNDO_LIMIT)
    undoStack.shift();
});

useAppState.subscribe((state) =>
  localStorage.setItem(appStateKey, JSON.stringify(state))
);

export function resetAllAppState() {
  useAppState.setState(deepCloneJson(defaultAppState));
}

/** throws on bad node id */
export const getNode = <T extends object>(nodeId: string) =>
  useAppState(s => s.document.nodes.find(n => n.id === nodeId)) as Node<T> | undefined;

export const makeNodeDataSetter = <T extends object>(nodeId: string) => (value: Partial<T> | ((s: T) => Partial<T>)) => {
  useAppState.setState((s) => {
    const nodes = s.document.nodes.slice();
    const thisNodeIndex = s.document.nodes.findIndex(n => n.id === nodeId);
    const thisNode = s.document.nodes[thisNodeIndex] as Node<T>;
    nodes[thisNodeIndex] = {
      ...thisNode,
      data: {
        ...thisNode.data,
        ...typeof value === "function" ? value(thisNode.data) : value,
      },
    };
    return {
      document: {
        ...s.document,
        nodes,
      },
    };
  });
};
