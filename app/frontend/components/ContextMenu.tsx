import React, { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react"
import ReactDOM from 'react-dom';
import styles from './ContextMenu.module.css'
import { classNames, useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";
import { useOnExternalClick } from "@bentley/react-hooks";
import { MouseBinding, eventMatchesMouseBinding } from "./KeyBindingInput";
import { assert } from "js-utils/lib/browser-utils";
import { autoUpdate, useClick, useDismiss, useFloating, useInteractions } from "@floating-ui/react";

const contextMenuRoot = document.getElementById("context-menu-root");
assert(contextMenuRoot, "context menu root didn't exist");

export const defaultCustomEventKey = "force-custom-contextmenu";

/** raw context menu primitive, prefer @see ContextMenuOptions usually */
export const ContextMenu = React.forwardRef<ContextMenu.Ref, ContextMenu.Props>(({
  autoCloseDelay = 500,
  children,
  mouseBinding = { button: 2 } as MouseEvent,
  onHide,
  /** a custom event type that can be used to invoke the context menu to appear regardless of the binding */
  forceEventKey = defaultCustomEventKey,
}, ref) => {
  const rootElemRef = useRef<HTMLDivElement>(null);
  const nonPortalledElemRef = useRef<HTMLDivElement>(null);

  // TODO: type check that the handles here are mutually exlusive with those in mouseInteractProps
  const mouseUninterested = useOnNoLongerMouseInteracted({
    delayMs: autoCloseDelay,
    onUninterested() {
      hide();
    },
  });

  const isShown = () => (rootElemRef.current && rootElemRef.current.style.display !== "none");
  const hide = () => {
    if (rootElemRef.current)
      rootElemRef.current.style.display = "none";
    onHide?.();
  };
  const show = () => {
    if (rootElemRef.current)
      (rootElemRef.current.style.display as any) = null;
    //mouseUninterested.forceInterest();
  };

  // FIXME: need to inline this logic into our own click handler
  // useOnExternalClick(rootElemRef, () => {
  //   if (isShown())
  //     hide();
  // });

  useImperativeHandle(ref, () => ({
    hide,
    show,
  }));

  useLayoutEffect(() => {
    hide();

    const parentElem = nonPortalledElemRef.current?.parentElement;

    const handler = (e: MouseEvent) => {
      if (!eventMatchesMouseBinding(e, mouseBinding) && e.type !== forceEventKey)
        return;
      e.preventDefault();
      e.stopPropagation();
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
    parentElem?.addEventListener("dblclick", handler);
    document.addEventListener(forceEventKey as any, handler);
    eventsToPrevent.forEach((e) => parentElem?.addEventListener(e, preventDefault));
    eventsToPrevent.forEach((e) => rootElemRef.current?.addEventListener(e, preventDefault));
    return () =>  {
      parentElem?.removeEventListener("mousedown", handler);
      parentElem?.removeEventListener("dblclick", handler);
      document.removeEventListener(forceEventKey as any, handler);
      eventsToPrevent.forEach((e) => parentElem?.removeEventListener(e, preventDefault));
      eventsToPrevent.forEach((e) => rootElemRef.current?.removeEventListener(e, preventDefault));
    }
  }, [mouseBinding]);

  const initialDisplayNone = useRef(true);
  useEffect(() => void (initialDisplayNone.current = false), []);

  // note that we need the root elem to be outside of the portal if we want to use the
  // DOM parentElement API
  return <div ref={nonPortalledElemRef} style={{ display: "none" }}>
    {/* @ts-ignore */}
    {ReactDOM.createPortal(
      <div
        ref={rootElemRef}
        className={styles.contextMenuRoot}
        {...mouseUninterested.props}
        style={{ display: initialDisplayNone ? "none" : "initial" }}
      >
        {children}
      </div>,
      contextMenuRoot,
    )}
  </div>;
});

export namespace ContextMenu {
  export interface BaseProps {
    /** delay after un-hovering the context menu before it auto closes */
    autoCloseDelay?: number;
    mouseBinding?: MouseBinding;
    onHide?(): void;
    forceEventKey?: string;
  }

  export interface Props extends React.PropsWithChildren, BaseProps {}

  export interface Ref {
    hide(): void;
    show(): void;
  }
}

export const Options = React.forwardRef<
  HTMLDivElement,
  {
    options: ContextMenuOptions.Option[],
    onAfterSelect?: () => void,
  } & React.HTMLProps<HTMLDivElement>>(
  (props, ref) => {
    const { options, onAfterSelect, ...divProps } = props;
    return (
      <div
        {...divProps}
        {...classNames("alternis__floatingbox", styles.contextMenuOptions, divProps.className)}
        ref={ref}
      >
        {props.options.map(option => (
          <div
            key={option.id}
            onClick={async (e) => {
              await option.onSelect(e);
              props.onAfterSelect?.();
            }}
            {...classNames(styles.contextMenuOption, "alternis__hoverable")}
          >
            <a style={{ color: "inherit" }}>{option.label ?? option.id}</a>
          </div>
        ))}
      </div>
    );
  }
);

export function ContextMenuOptions(props: ContextMenuOptions.Props) {
  const { options, autoCloseDelay, mouseBinding,  onHide, forceEventKey, ...divProps } = props;
  const baseProps: ContextMenu.BaseProps = { autoCloseDelay, mouseBinding, onHide, forceEventKey };
  const ctxMenuRef = useRef<ContextMenu.Ref>(null);
  return (
    <ContextMenu ref={ctxMenuRef} {...baseProps}>
      <Options onAfterSelect={() => ctxMenuRef.current?.hide()} options={options} {...divProps} />
    </ContextMenu>
  );
}

export namespace ContextMenuOptions {
  export interface Option {
    id: string;
    label?: string;
    onSelect: (e: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
  }

  export interface Props extends React.HTMLProps<HTMLDivElement>, ContextMenu.BaseProps {
    options: Option[];
    button?: React.ReactNode;
  }
}

export const threeDots = (
  <div style={{ display: "flex", flexDirection: "row", gap: 4, padding: 8 }}>
    <span className="alternis__hoverable" style={{borderRadius: "50%", width: 4, height: 4, backgroundColor: "var(--fg-1)" }} />
    <span className="alternis__hoverable" style={{borderRadius: "50%", width: 4, height: 4, backgroundColor: "var(--fg-1)" }} />
    <span className="alternis__hoverable" style={{borderRadius: "50%", width: 4, height: 4, backgroundColor: "var(--fg-1)" }} />
  </div>
);

export function MoreMenu(props: ContextMenuOptions.Props) {
  const [isOpen, setIsOpen] = useState(false);

  const { context, floatingStyles, refs } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const { options, ...divProps } = props;

  return (
    <div
      {...divProps}
      style={{ position: "absolute", ...divProps.style }}
    >
      <div ref={refs.setReference} {...getReferenceProps()}>
        {props.button ?? threeDots}
      </div>
      {isOpen && (
        <Options
          options={props.options}
          onAfterSelect={() => {
            setIsOpen(false);
          }}
          {...classNames(styles.contextMenuOptions, props.className)}
          style={{
            width: "max-content",
            height: "fit-content",
            zIndex: 1,
            ...props.style,
            ...floatingStyles
          }}
          ref={refs.setFloating}
          {...getFloatingProps()}
        />
      )}
    </div>
  );
}

export namespace MoreMenu {
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    options: ContextMenuOptions.Option[];
  };
}
