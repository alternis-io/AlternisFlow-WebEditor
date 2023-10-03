import type { Node, Edge } from 'reactflow'
import { Participant } from "../common/data-types/participant";
import { deepCloneJson } from "js-utils/lib/react-utils";
import { create, useStore } from "zustand";
import { TemporalState, temporal } from "zundo";
import { DeepPartial } from "ts-essentials/dist/deep-partial";
import { MouseBinding } from "./components/KeyBindingInput" ;
import { BaseNodeData } from './nodes/data';

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

export const defaultAppState = {
  preferences: {
    participantEditor: {
      iconSize: "medium" as IconSizes,
      lastSelected: undefined as undefined | string,
    },

    graph: {
      // temporary while custom drag start button is unimplemented
      enableBoxSelectOnDrag: true,
      dragBoxSelectMouseBinding: { button: 0 } as MouseBinding,
      dragPanMouseBinding: { button: 2 } as MouseBinding,
      ...clientIsMac ? {
        addNodeMouseBinding: { button: 2, metaKey: true } as MouseBinding,
        appendToSelectModifier: KeyModifiers.Meta as KeyModifiers | null,
      } : {
        addNodeMouseBinding: { button: 2, ctrlKey: true } as MouseBinding,
        appendToSelectModifier: KeyModifiers.Control as KeyModifiers | null,
      }
    }
  },

  permissions: {
    version: "trial" as "trial" | "standard" | "pro",
  },

  projectId: undefined as string | undefined,

  // TODO: document should be optional...
  document: {
    name: "New project",
    nodes: [{
      id: '1',
      type: 'entry',
      position: { x: 540, y: 100 },
    }] as Node<BaseNodeData>[],
    edges: [] as Edge<any>[],
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

const appStateKey = "alternis-v1_appState";

import template1 from "./templates/template1.json";

const initialState: AppState = (() => {
  let maybeLocallyStoredState: AppState | undefined;

  try {
    const localState = localStorage.getItem(appStateKey);
    if (localState !== null)
      maybeLocallyStoredState = JSON.parse(localState);
  } catch {}

  return {
    ...deepCloneJson(defaultAppState),
    ...maybeLocallyStoredState,
    ...window.location.hash.includes("?trial") && {
      document: template1 as AppState["document"]
    },
  };
})();

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

export const useTemporalAppState = <T extends any>(
  selector: (state: TemporalState<SettableState<AppState>>) => T,
  equality?: (a: T, b: T) => boolean,
) => useStore(useAppState.temporal, selector, equality);


// FIXME: replace with "persist" middleware
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
