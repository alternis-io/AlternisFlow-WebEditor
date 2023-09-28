import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import styles from './ContextMenu.module.css'
import { classNames, useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";
import { useOnExternalClick } from "@bentley/react-hooks";
import { MouseBinding, eventMatchesMouseBinding, onMouseInteractionDomHandlers } from "./KeyBindingInput";

export const ContextMenu = ({
  autoCloseDelay = 1_000,
  children,
  mouseBinding = { button: 2 },
}: ContextMenu.Props) => {
  const rootElemRef = useRef<HTMLDivElement>(null);

  const isShown = () => (rootElemRef.current && rootElemRef.current.style.display !== "none");
  const hide = () => (rootElemRef.current && (rootElemRef.current.style.display = "none"));
  const show = () => (rootElemRef.current && ((rootElemRef.current.style.display as any) = null));

  useOnExternalClick(rootElemRef, () => {
    if (isShown())
      hide();
  });

  useLayoutEffect(() => {
    hide();

    const parentElem = rootElemRef.current?.parentElement;

    const handler = (e: MouseEvent) => {
      if (!eventMatchesMouseBinding(e, mouseBinding))
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (rootElemRef.current) {
        // FIXME: use a react portal to prevent stacking contexts from causing weird offsets
        rootElemRef.current.style.top = `${e.pageY}px`;
        rootElemRef.current.style.left = `${e.pageX}px`;
      }
      show();
      return false;
    };

    const preventDefault = (e: MouseEvent) => e.preventDefault();
    const eventsToPrevent = ["contextmenu", "click", "dblclick", "auxclick"] as const;
    parentElem?.addEventListener("mousedown", handler);
    eventsToPrevent.forEach((e) => parentElem?.addEventListener(e, preventDefault));
    return () =>  {
      parentElem?.removeEventListener("mousedown", handler);
      eventsToPrevent.forEach((e) => parentElem?.removeEventListener(e, preventDefault));
    }
  }, [mouseBinding]);

  // TODO: type check that the handles here are mutually exlusive with those in mouseInteractProps
  const mouseUninterestedProps = useOnNoLongerMouseInteracted({
    delayMs: autoCloseDelay,
    onUninterested() {
      hide();
    },
  });

  const initialDisplayNone = useRef(true);
  useEffect(() => void (initialDisplayNone.current = false), []);

  return (
    <div
      ref={rootElemRef}
      className={styles.contextMenuRoot}
      //{...mouseInteractProps}
      {...mouseUninterestedProps}
      style={{ display: initialDisplayNone ? "none" : undefined }}
    >
      {children}
    </div>
  );
}

export namespace ContextMenu {
  export interface Props extends React.PropsWithChildren {
    /** delay after un-hovering the context menu before it auto closes */
    autoCloseDelay?: number;
    mouseBinding?: MouseBinding;
  }
}


export function ContextMenuOptions(props: ContextMenuOptions.Props) {
  const { options, ...divProps } = props;
  return (
    <div {...divProps} {...classNames(styles.contextMenuOptions, props.className)}>
      {props.options.map(option => (
        <li
          key={option.id}
          onClick={option.onSelect}
          {...classNames(styles.contextMenuOption, "hoverable")}
        >
          <a style={{ color: "inherit" }}>{option.label ?? option.id}</a>
        </li>
      ))}
    </div>
  );
}

export namespace ContextMenuOptions {
  export interface Option {
    id: string;
    label?: string;
    onSelect: React.MouseEventHandler<HTMLLIElement>;
  }

  export interface Props extends React.HTMLProps<HTMLDivElement> {
    options: Option[];
  }
}
