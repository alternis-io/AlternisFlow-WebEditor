import type { Node, Edge } from "reactflow";
import type { NodeTypes } from "./TestGraphEditor";
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "js-utils/lib/react-utils";
import { create, useStore } from "zustand";
import { TemporalState, temporal } from "zundo";
import { DeepPartial } from "ts-essentials/dist/deep-partial";
import { MouseBinding } from "./components/KeyBindingInput" ;
import { BaseNodeData } from "./nodes/data";

// FIXME: move out icon data and get type from that list
export type IconSizes = "small" | "medium" | "large";

export const MouseButtons = {
  Left: 0,
  Middle: 1,
  Right: 2,
};
export type MouseButtons = typeof MouseButtons[keyof typeof MouseButtons];

export const MouseInteractions = {
  Left: 0,
  Middle: 1,
  Right: 2,
  DoubleClick: "double-click",
} as const;
export type MouseInteractions = typeof MouseInteractions[keyof typeof MouseInteractions];

export const onMouseInteractionProps = <T,>(
  mouseInteraction: MouseInteractions,
  handler: React.MouseEventHandler<T>,
): React.DOMAttributes<T> => {
  if (mouseInteraction === MouseButtons.Left as 0)
    return { onClick: handler }
  else if (mouseInteraction === MouseButtons.Middle as 1)
    return { onMouseDown: (e) => e.button === mouseInteraction && handler(e) };
  else if (mouseInteraction === MouseButtons.Right as 2)
    return { onContextMenu: handler };
  else if (mouseInteraction === "double-click")
    return { onDoubleClick: handler };
  return {};
};

export const onMouseInteractionDomHandlers = (
  mouseInteraction: MouseInteractions,
  handler: (e: MouseEvent) => void,
) => {
  if (mouseInteraction === MouseButtons.Left as 0)
    return ["click", handler] as const;
  else if (mouseInteraction === MouseButtons.Middle as 1)
    return ["mousedown", (e: MouseEvent) => { if (e.button === mouseInteraction) handler(e); }] as const;
  else if (mouseInteraction === MouseButtons.Right as 2)
    return ["contextmenu", handler] as const;
  else // if (mouseInteraction === "double-click")
    return ["dblclick", handler] as const;
};

export enum KeyModifiers {
  Control = "Control",
  Meta = "Meta",
  Alt = "Alt",
  Shift = "Shift",
}

export const clientIsMac = /Mac/.test(navigator.userAgent);
export const clientIsLinux = /Linux/.test(navigator.userAgent);

type _Node = Node<BaseNodeData, NodeTypes>;
export { _Node as Node };

export const defaultDialogue = {
  nodes: [{
    id: '1',
    type: 'entry',
    position: { x: 540, y: 100 },
  }] as _Node[],
  edges: [] as Edge<any>[],
};

export type Dialogue = typeof defaultDialogue;

const defaultDialogueId = "My Dialogue"

export const defaultAppState = {
  preferences: {
    participantEditor: {
      iconSize: "medium" as IconSizes,
      lastSelected: undefined as undefined | string,
    },

    graph: {
      // temporary while custom drag start button is unimplemented
      enableBoxSelectOnDrag: false,
      // NOTE: not used
      dragBoxSelectMouseBinding: { button: 0 } as MouseBinding,
      dragPanMouseBinding: { button: 0 } as MouseBinding,
      ...clientIsMac ? {
        // FIXME: check that this works
        addNodeMouseBinding: { button: 0, type: "dblclick" } as MouseBinding,
        appendToSelectModifier: KeyModifiers.Meta as KeyModifiers | null,
      } : {
        addNodeMouseBinding: { button: 2 } as MouseBinding,
        appendToSelectModifier: KeyModifiers.Control as KeyModifiers | null,
      }
    }
  },

  permissions: {
    // this means nothing, since I am open sourcing it
    // but I'll leave it in if anyone ever asks for a special kind of
    // account with cloud storage or something
    version: "trial" as "trial" | "standard" | "pro",
  },

  // FIXME: this should always be defined
  projectId: undefined as string | undefined,

  currentDialogueId: defaultDialogueId,

  // TODO: document should be optional...
  document: {
    /** FIXME: must be a number on some backends? */
    id: "0",
    updatedAt: new Date().toISOString(),
    ownerEmail: undefined as string | undefined,
    name: "New project",
    dialogues: {
      [defaultDialogueId]: defaultDialogue,
    } as {
      [name: string]: Dialogue;
    },
    participants: [] as Participant[],
    variables: {} as {
      [name: string]: {
        type: "string" | "boolean",
        default: string,
      },
    },
    functions: {} as {
      [name: string]: {},
    },
  },
};

Object.freeze(defaultAppState);

export type AppState = typeof defaultAppState;
export type Document = AppState["document"]
export type DocumentHeader = Pick<Document, "id" | "name" | "updatedAt" | "ownerEmail">;
export type Variable = AppState["document"]["variables"][string];

const appStateKey = "alternis-v1_appState";

import _template1 from "./templates/template1.json";
const template1 = _template1 as Document;

import { assert } from "js-utils/lib/browser-utils.js";

// FIXME: this codebase confuses hash and search a lot... fix that
let isLocalDemo = () => window.location.hash.includes("?demo");

const initialState: AppState = {
  ...structuredClone(defaultAppState),
  //...maybeLocallyStoredState,
  ...isLocalDemo() && {
    document: template1 as AppState["document"],
    currentDialogueId: Object.keys(template1.dialogues)[0],
  },
};

type SettableState<T extends any> = T & {
  /** @deprecated, just use useAppState.setState */
  set(
    cb: (s: T) => DeepPartial<T> | Promise<DeepPartial<T>>,
  ): void;
};

export const useAppState = create<SettableState<AppState>>()(
  temporal((set) => ({
    ...initialState,
    set: set as SettableState<AppState>["set"],
  }),
));

export function getCurrentDialogue(s: AppState, opts: { assert: true }): Dialogue;
export function getCurrentDialogue(s: AppState, opts?: { assert?: boolean }): Dialogue | undefined;
// NOTE: funky typescript union of function types
export function getCurrentDialogue(s: AppState, opts?: { assert?: boolean }): Dialogue | undefined {
  const result = s.currentDialogueId === undefined
    ? undefined
    : s.document.dialogues[s.currentDialogueId];
  if (opts?.assert && result === undefined)
    throw Error(`Current dialogue '${s.currentDialogueId}' was not defined`);
  return result;
}

export function useCurrentDialogue<T>(cb: (s: Dialogue) => T, opts: { assert: true }): T;
export function useCurrentDialogue<T>(cb: (s: Dialogue | undefined) => T, opts?: { assert?: boolean }): T;
export function useCurrentDialogue(): Dialogue | undefined;
// NOTE: funky typescript union of function types
export function useCurrentDialogue<T>(cb?: ((s: Dialogue) => T) | ((s: Dialogue | undefined) => T), opts?: { assert?: boolean }): T {
  return useAppState((s) => {
    const currentDialogue = getCurrentDialogue(s, opts);
    if (cb === undefined) return currentDialogue as T;
    return (cb as (s: Dialogue | undefined) => T)(currentDialogue);
  });
}

export namespace useCurrentDialogue {
  export const setState = (value: Partial<Dialogue> | ((s: Dialogue) => Partial<Dialogue>)) => {
    useAppState.setState((s) => {
      if (!s.currentDialogueId) return s;
      const currentDialogue = s.document.dialogues[s.currentDialogueId];

      return {
        document: {
          ...s.document,
          dialogues: {
            ...s.document.dialogues,
            [s.currentDialogueId]: {
              ...currentDialogue,
              ...typeof value === "function" ? value(currentDialogue) : value,
            },
          },
        },
      };
    });
  };

  export const getState = () => {
    const s = useAppState.getState();
    if (!s.currentDialogueId) return undefined;
    return s.document.dialogues[s.currentDialogueId];
  };
}

// FIXME: this needs to ignore API based changes!
export const useTemporalAppState = <T extends any>(
  selector: (state: TemporalState<SettableState<AppState>>) => T,
  equality?: (a: T, b: T) => boolean,
) => useStore(useAppState.temporal, selector, equality);


// FIXME: replace with "persist" middleware?
// FIXME: replace with custom middleware for pouchdb?
useAppState.subscribe((state) =>
  localStorage.setItem(appStateKey, JSON.stringify(state))
);

let promotedLocalDemo = false;
useAppState.subscribe((state) => {
  if (!promotedLocalDemo && isLocalDemo()) {
    window.location.hash = window.location.hash.replace("?demo", "");
    promotedLocalDemo = true;
  }
});


export function resetAllAppState() {
  useAppState.setState(deepCloneJson(defaultAppState));
}

/** throws on bad node id or no current dialogue */
export const getNode = <T extends object>(nodeId: string) =>
  useCurrentDialogue(s => s.nodes.find(n => n.id === nodeId), { assert: true }) as Node<T> | undefined;

export const makeNodeDataSetter = <T extends BaseNodeData>(nodeId: string) => (value: Partial<T> | ((s: T) => Partial<T>)) => {
  useAppState.setState((s) => {
    const currentDialogue = getCurrentDialogue(s, { assert: true });
    assert(s.currentDialogueId);
    const nodes = currentDialogue.nodes.slice();
    const thisNodeIndex = currentDialogue.nodes.findIndex(n => n.id === nodeId);
    const thisNode = currentDialogue.nodes[thisNodeIndex] as _Node | undefined;

    if (thisNode === undefined)
      return s;

    nodes[thisNodeIndex] = {
      ...thisNode,
      data: {
        ...thisNode.data,
        ...typeof value === "function" ? value(thisNode.data as T) : value,
      },
    };

    return {
      document: {
        ...s.document,
        dialogues: {
          ...s.document.dialogues,
          [s.currentDialogueId]: {
            ...s.document.dialogues[s.currentDialogueId],
            nodes,
          },
        },
      },
    };
  });
};
