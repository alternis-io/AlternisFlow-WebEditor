import React, { useLayoutEffect, useRef, useState } from "react"
import styles from './ContextMenu.module.css'
import { assert } from "../browser-utils";
import { classNames } from "../react-utils";

export const ContextMenu = ({
  autoCloseDelay = 1_000,
  children,
}: ContextMenu.Props) => {
  const rootElementRef = useRef<HTMLDivElement>(null);

  // HACK: there should be a better way... maybe custom mouseup/down handling?
  const doBlockLeftClick = React.useRef(false);

  useLayoutEffect(() => {
    const rootElem = rootElementRef.current;
    assert(rootElem);

    const parentElem = rootElementRef.current?.parentElement;

    
    // FIXME: this does in fact not happen before mount first paint
    rootElem.style.display = "none";

    // TODO: lodash debounce delayed close if user doesn't hover the context menu for long?

    const hide = () => (rootElem.style.display = "none");
    const show = () => ((rootElem.style as any).display = null);

    let timeout: NodeJS.Timeout | undefined;

    const onMouseEnter = (e: MouseEvent) => {
      e.preventDefault();
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
    };

    const onMouseLeave = (e: MouseEvent) => {
      e.preventDefault();
      timeout = setTimeout(hide, autoCloseDelay);
    };

    const onRightClick = (e: MouseEvent) => {
      e.preventDefault();
      if (e[Symbol.for("__isConnectEnd")]) {
        doBlockLeftClick.current = true;
        setTimeout(() => doBlockLeftClick.current = false, 1);
      }
      // FIXME: null or delete?
      rootElem.style.top = `${e.pageY}`;
      rootElem.style.left = `${e.pageX}`;
      show();
    };

    const onLeftClick = (e: MouseEvent) => {
      if (rootElem.style.display === "none")
        return;
      e.preventDefault();
      if (doBlockLeftClick.current) return;
      const clickInContextMenu = e.currentTarget === rootElem
        || rootElem.contains(e.currentTarget as HTMLElement);
      if (clickInContextMenu)
        return;
      hide();
    };

    parentElem?.addEventListener("contextmenu", onRightClick);
    parentElem?.addEventListener("click", onLeftClick);
    rootElem.addEventListener("mouseenter", onMouseEnter);
    rootElem.addEventListener("mouseleave", onMouseLeave);

    return () => {
      parentElem?.removeEventListener("contextmenu", onRightClick);
      parentElem?.removeEventListener("click", onLeftClick);
      rootElem.removeEventListener("mouseenter", onMouseEnter);
      rootElem.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return <div ref={rootElementRef} className={styles.contextMenuRoot}>{children}</div>;
}

export namespace ContextMenu {
  export interface Props extends React.PropsWithChildren {
    /** delay after un-hovering the context menu before it auto closes */
    autoCloseDelay?: number;
  }
}


export function ContextMenuOptions(props: ContextMenuOptions.Props) {
  return (
    <div {...props} {...classNames(styles.contextMenuOptions, props.className)}>
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
