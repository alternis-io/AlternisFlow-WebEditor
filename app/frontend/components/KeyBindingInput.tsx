import React, { useEffect, useState } from "react";
import styles from "./Ide.module.css";

export interface KeyBinding {
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  key: string;
}

export function KeyBindingInput(props: KeyBindingInput.Props) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (listening) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift" || e.key === "Control" || e.key === "Meta" || e.key === "Alt")
          return;
        props.onChange?.({
          key: e.key,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
        });
        setListening(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [listening]);

  // FIXME: not developed unlike MouseBindingInput, unused
  return (
    <input type="button" value={props.value.key} onClick={() => setListening(true)}>
    </input>
  );
}

export namespace KeyBindingInput {
  export interface Props {
    onChange?(k: KeyBinding): void;
    value: KeyBinding;
  }
}

export type MouseBinding =
  | {
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    button: number;
  }
  | "double-click";

const mouseBindingNames: Record<number, string | undefined> = {
  0: "left mouse button",
  1: "middle mouse button",
  2: "right mouse button",
  3: "aux mouse button 1",
  4: "aux mouse button 2"
};

function mouseBindingToLabel(b: MouseBinding): string {
  return b === "double-click"
    ? "double click"
    : (b.ctrlKey ? "ctrl+" : "")
       + (b.shiftKey ? "shift+" : "")
       + (b.altKey ? "alt+" : "")
       + (b.metaKey ? "meta+" : "")
       + mouseBindingNames[b.button] ?? "unknown mouse aux";
}

export function eventMatchesMouseBinding(e: MouseEvent | React.MouseEvent<any>, b: MouseBinding) {
  return b === "double-click"
    ? e.type === "dblclick"
    : (
      e.button === b.button
      && !!b.ctrlKey === e.ctrlKey
      && !!b.altKey === e.altKey
      && !!b.shiftKey === e.shiftKey
      && !!b.metaKey === e.metaKey
    );
}

export function MouseBindingInput(props: MouseBindingInput.Props) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (listening) {
      const onMouseDown = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let onDoubleClick: () => void;
        const doubleClickPromise = new Promise<"double-click">((resolve) => {
          onDoubleClick = () => resolve("double-click");
          document.addEventListener("dblclick", onDoubleClick);
        }).finally(() => document.removeEventListener("dblclick", onDoubleClick));

        const delay = new Promise(resolve => setTimeout(resolve, 200));
        const winner = await Promise.race([doubleClickPromise, delay]);

        if (winner === "double-click")

        props.onChange?.({
          button: e.button,
          ctrlKey: !props.ignoreModifiers && e.ctrlKey,
          altKey: !props.ignoreModifiers && e.altKey,
          metaKey: !props.ignoreModifiers && e.metaKey,
          shiftKey: !props.ignoreModifiers && e.shiftKey,
        });

        setListening(false);
        return false;
      };
      document.addEventListener("mousedown", onMouseDown, true);
      return () => document.removeEventListener("mousedown", onMouseDown, true);
    }
  }, [listening]);

  return (
    <button onClick={() => setListening(true)}>
      {listening ? <>press your button...</> : mouseBindingToLabel(props.value)}
    </button>
  );
}

export namespace MouseBindingInput {
  export interface Props {
    onChange?(k: MouseBinding): void;
    value: MouseBinding;
    ignoreModifiers?: boolean;
  }
}
