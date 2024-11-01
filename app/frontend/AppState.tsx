import type { Node, Edge } from "reactflow";
import type { NodeTypes } from "./TestGraphEditor";
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "js-utils/lib/react-utils";
import { create, useStore } from "zustand";
import { TemporalState, temporal } from "zundo";
import { MouseBinding } from "./components/KeyBindingInput" ;
import { BaseNodeData } from "./nodes/data";
import { useDoc } from "use-pouchdb";

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

// FIXME: I think all of this can go in pouchdb...
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

  projectId: undefined as string | undefined,

  currentDialogueId: defaultDialogueId,
};

export interface Document {
  /** FIXME: must be a number on some backends? */
  id: string;
  updatedAt: string;
  ownerEmail: string | undefined;
  name: string;
  dialogues: Record<string, Dialogue>;
  participants: Participant[],
  variables: Record<string, {
    type: "string" | "boolean",
    default: string,
  }>;
  functions: Record<string, {}>,
}

Object.freeze(defaultAppState);

export type AppState = typeof defaultAppState;
export type DocumentHeader = Pick<Document, "id" | "name" | "updatedAt" | "ownerEmail">;
export type Variable = Document["variables"][string];

const appStateKey = "alternis-v1_appState";

import _template1 from "./templates/template1.json";
const template1 = _template1 as any as Document;
const demoDocId = _template1.id;

import { assert } from "js-utils/lib/browser-utils.js";
import { docs } from "./api/usePouchDbApi";

// FIXME: this codebase confuses hash and search a lot... fix that
let isLocalDemo = () => {
  return window.location.hash.includes("demo") || window.location.search.includes("demo");
};

// FIXME: goes away once document can be undefined
const initialStateNoDoc: Omit<AppState, "document"> = structuredClone(defaultAppState);
delete (initialStateNoDoc as any).document;

const initialState: AppState = (() => {
  let maybeLocallyStoredState: AppState | undefined;

  try {
    const localState = localStorage.getItem(appStateKey);
    if (localState !== null)
      maybeLocallyStoredState = JSON.parse(localState);
  } catch {}

  return {
    ...initialStateNoDoc,
    ...maybeLocallyStoredState,
    ...isLocalDemo() && {
      currentDialogueId: Object.keys(template1.dialogues)[0],
    },
  };
})();

export const useAppState = create<AppState>()(
  temporal(() => ({ ...initialState, }),
));

declare global {
  var _appState: typeof useAppState;
}

globalThis._appState = useAppState;

const emptyDocDialogueId = defaultDialogueId;

export const emptyDoc = {
  id: "0",
  name: "",
  // FIXME: would be nice to not need a current dialogue in case this causes
  // a jitter in the dialogue list
  dialogues: {
    [emptyDocDialogueId]: {
      nodes: [
        {
          id: "1",
          type: "entry",
          position: {
            x: 255,
            y: 105
          },
          data: {},
          width: 68,
          height: 41,
          selected: false,
          positionAbsolute: {
            x: 255,
            y: 105
          },
          dragging: false
        },
      ],
      edges: [],
    },
  },
  updatedAt: new Date().toISOString(),
  ownerEmail: undefined,
  participants: [],
  variables: {},
  functions: {}
} as Document;

// FIXME: use this because pouchdb api mutates it, but it should mutate it identically
// so safe for now
//Object.freeze(emptyDoc);

const failingId = "";

// FIXME: remove document from useAppState state
export function useCurrentDocument<T>(selector: ((d: Document) => T)): T;
export function useCurrentDocument(): Document;
export function useCurrentDocument<T>(selector?: ((d: Document) => T)): T {
  const id = useAppState(s => s.projectId) ?? "";
  const doc = useDoc<Document>(id ?? failingId, undefined, emptyDoc).doc as Document;
  return typeof selector === "function" ? selector(doc) : doc as T;
}

export function useCurrentDialogue<T>(cb: (s: Dialogue) => T): T;
export function useCurrentDialogue<T>(cb: (s: Dialogue) => T): T;
export function useCurrentDialogue(): Dialogue;
// NOTE: funky typescript union of function types
export function useCurrentDialogue<T>(cb?: ((s: Dialogue) => T)): T {
  const id = useAppState(s => s.projectId);
  const doc = useDoc<Document>(id ?? failingId, undefined, emptyDoc).doc as Document;

  const docWasEmpty = doc === emptyDoc;
  const currentDialogueId = useAppState(s => s.currentDialogueId);
  const dialogueId = docWasEmpty ? emptyDocDialogueId : currentDialogueId;
  // FIXME: when adding a new dialogue, even though we (asynchronously) put the new dialogue
  // right before changing the app state to consider it the current dialogue, the changes
  // listener doesn't seem to pick up the new dialogue yet so we may temporarily
  // request a dialogue that isn't seen in the state yet. In that case, just return an
  // empty dialogue
  const dialogue = doc.dialogues[dialogueId] ?? emptyDoc.dialogues[emptyDocDialogueId];

  return cb ? cb(dialogue as Dialogue) : dialogue as T;
}

let prevCurrentDialogueSet: Promise<any> = Promise.resolve();

// FIXME: remove?
export namespace useCurrentDialogue {
  export const setState = async (value: Partial<Dialogue> | ((s: Dialogue) => Partial<Dialogue>), ordered = false) => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined)
      return;
    const currentDialogueId = useAppState.getState().currentDialogueId;

    const performSet = async () => await docs.upsert(docId, (doc) => {
      const currentDialogue = doc.dialogues![currentDialogueId];
      return {
        ...doc as Document,
        dialogues: {
          ...doc.dialogues,
          [currentDialogueId]: {
            ...currentDialogue,
            ...typeof value === "function" ? value(currentDialogue) : value,
          },
        },
      };
    });

    if (ordered)
      prevCurrentDialogueSet = prevCurrentDialogueSet.then(performSet);
    else
      performSet();
  };

  export const getState = async () => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined)
      throw Error("attempted to useCurrentDialogue.getState without a loaded document");
    const doc = await docs.get(docId);
    const currentDialogueId = useAppState.getState().currentDialogueId;
    const currentDialogue = doc.dialogues[currentDialogueId];
    return currentDialogue;
  };
}

// FIXME: this needs to ignore API based changes!
export const useTemporalAppState = <T extends any>(
  selector: (state: TemporalState<AppState>) => T,
  equality?: (a: T, b: T) => boolean,
) => useStore(useAppState.temporal, selector, equality);


// FIXME: replace with "persist" middleware?
// FIXME: replace with pouchdb?
useAppState.subscribe((state) =>
  localStorage.setItem(appStateKey, JSON.stringify(state))
);

if (isLocalDemo()) {
  const listenedState = (doc: Document) => [
    Object.entries(doc.dialogues).map(([name, dialogue]) => [
      name,
      dialogue.nodes.map(n => [n.id, n.type, n.data]),
      dialogue.edges.map(e => [e.id, e.source, e.target])
    ])
  ];

  const demoListenedState = JSON.stringify(listenedState(template1));

  const impl = async () => {
    // if we're in the demo, install the demo document
    await docs.putIfNotExists({
      ...template1,
      _id: "hidden/demo1",
    });

    useAppState.setState({
      projectId: "hidden/demo1",
      currentDialogueId: Object.keys(template1.dialogues)[0],
    });

    const changes = docs.changes({ since: "now", include_docs: true, live: true })
      .on("change", (change) => {
        const changedFromDemo = () => JSON.stringify(listenedState(change.doc!)) !== demoListenedState;

        if (change.id === demoDocId && isLocalDemo() && changedFromDemo()) {
          window.location.hash = window.location.hash.replace("demo", "");
          window.location.search = window.location.search.replace("demo", "");
          changes.removeAllListeners();
        }
      });
  };

  void impl();
}

export function resetAllAppState() {
  useAppState.setState(deepCloneJson(defaultAppState));
}

/** throws on bad node id or no current dialogue */
export const getNode = <T extends object>(nodeId: string) =>
  useCurrentDialogue(s =>
    s.nodes.find(n => n.id === nodeId),
  ) as Node<T> | undefined;

export const makeNodeDataSetter = <T extends BaseNodeData>(nodeId: string) =>
  (value: Partial<T> | ((s: T) => Partial<T>)) => {
    useCurrentDialogue.setState((d) => {
      const nodes = d.nodes.slice();
      const thisNodeIndex = d.nodes.findIndex(n => n.id === nodeId);
      const thisNode = d.nodes[thisNodeIndex] as _Node | undefined;

      if (thisNode === undefined)
        return d;

      nodes[thisNodeIndex] = {
        ...thisNode,
        data: {
          ...thisNode.data,
          ...typeof value === "function" ? value(thisNode.data as T) : value,
        },
      };

      return {
        ...d,
        nodes,
      };
    });
  };
