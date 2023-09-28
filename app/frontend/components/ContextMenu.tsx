import React, { useLayoutEffect, useRef, useState } from "react"
import styles from './ContextMenu.module.css'
import { classNames, useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";
import { MouseInteractions, onMouseInteractionDomHandlers } from "../AppState";
import { useOnExternalClick } from "@bentley/react-hooks";

export const ContextMenu = ({
  autoCloseDelay = 1_000,
  children,
  activateInteraction = MouseInteractions.Right,
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

    const [eventName, handler] = onMouseInteractionDomHandlers(activateInteraction, (e) => {
      e.preventDefault();
      if (rootElemRef.current) {
        // FIXME: use a react portal to prevent stacking contexts from causing weird offsets
        rootElemRef.current.style.top = `${e.pageY}px`;
        rootElemRef.current.style.left = `${e.pageX}px`;
      }
      show();
    });
    
    // FIXME: bad types
    parentElem?.addEventListener(eventName, handler as any);
    return () => parentElem?.removeEventListener(eventName, handler as any);
  }, [activateInteraction]);

  // TODO: type check that the handles here are mutually exlusive with those in mouseInteractProps
  const mouseUninterestedProps = useOnNoLongerMouseInteracted({
    delayMs: autoCloseDelay,
    onUninterested() {
      hide();
    },
  });

  return (
    <div
      ref={rootElemRef}
      className={styles.contextMenuRoot}
      //{...mouseInteractProps}
      {...mouseUninterestedProps}
    >
      {children}
    </div>
  );
}

export namespace ContextMenu {
  export interface Props extends React.PropsWithChildren {
    /** delay after un-hovering the context menu before it auto closes */
    autoCloseDelay?: number;
    activateInteraction?: MouseInteractions;
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
