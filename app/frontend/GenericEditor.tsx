import React, { useEffect, useRef, useState } from "react";
import { AppState, useAppState } from "./AppState";
import "./shared.global.css";
import styles from "./GenericEditor.module.css";
import { Center } from "./Center";
import { classNames } from "js-utils/lib/react-utils";
import { Split } from "./Split";

// all keys that are a simple record
type SupportedKeys = "variables" | "functions" | "dialogues";

export function GenericEditor<T extends SupportedKeys>(
  props: GenericEditor.Props<T>
) {
  const generic = useAppState((s) => s.document[props.docPropKey]);
  const set = useAppState.setState;

  const [keyBeingEdited, setKeyBeingEdited] = React.useState<string>();
  const [proposedName, setProposedName] = useState<string>();

  const defaultSetGenericValue = typeof props.newInitialVal === "function"
    ? props.newInitialVal()
    : props.newInitialVal;

  const setGeneric = React.useCallback((
    name: string,
    value: Partial<AppState["document"][T][string]>,
  ) => set(s => ({
    document: {
      ...s.document,
      [props.docPropKey]: {
        ...s.document[props.docPropKey],
        [name]: {
          ...s.document[props.docPropKey][name],
          ...value,
        },
      },
    },
  })), [props.docPropKey]);

  const addGeneric = React.useCallback(
    (name: string) => setGeneric(name, defaultSetGenericValue),
    [setGeneric, defaultSetGenericValue],
  );

  const replaceGeneric = React.useCallback((
    oldName: string,
    newName: string,
  ) => set(s => {
    const result = {
      document: {
        ...s.document,
        [props.docPropKey]: {
          ...s.document[props.docPropKey],
          [newName]: s.document[props.docPropKey][oldName],
        },
      },
    };
    if (oldName !== newName)
      delete result.document.dialogues[oldName];
    return result;
  }), [props.docPropKey]);

  const deleteGeneric = React.useCallback((name: string) => set(s => {
    const generic = { ...s.document[props.docPropKey] };
    delete generic[name];
    return {
      document: {
        ...s.document,
        [props.docPropKey]: generic,
      },
    };
  }), [props.docPropKey]);

  const proposedNameInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (proposedName === "" || proposedName === keyBeingEdited) {
      proposedNameInputRef.current?.focus();
      // FIXME: use select once this ref is an input
    }
  }, [proposedName]);

  const finishProposedGeneric = (value: string) => {
    if (keyBeingEdited !== undefined) {
      replaceGeneric(keyBeingEdited, value)
      setKeyBeingEdited(undefined);
    } else {
      addGeneric(value);
    }
    setProposedName(undefined);
  };

  const ExtraActions = props.extraActions ?? React.useRef((_p: any) => null).current;

  return (
    <div style={{
      display: "grid",
      gap: "11px",
    }}>
      {Object.entries(generic)
      .filter(([name]) => name !== keyBeingEdited)
      .map(([name, data]) => (
        <Split
          key={name}
          left={
            <span
              title={
                // FIXME: this is bad
                props.getTitle?.(name, data as any)
                ?? "Double-click to edit the name."
                  + (props.noDrag ? "" : `\nDrag into the graph to add the corresponding node.`)
              }
              className="alternis__hoverable"
              onDoubleClick={() => {
                setKeyBeingEdited(name);
                setProposedName(name);
                proposedNameInputRef.current?.focus(); // doesn't exist yet!
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: props.docPropKey,
                  data,
                  id: name,
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={(e) => props.onClick?.(name, data as T, e)}
              draggable={!props.noDrag}
            >
              {name}
            </span>
          }
          right = {
            <div style={{display: "flex", flexDirection: "row"}}>
              <ExtraActions
                data={data as any}
                set={(d: Partial<AppState["document"][T][string]>) => setGeneric(name, d)}
              />
              <Center
                className="alternis__hoverable alternis__hoverable-red"
                title={`Delete this ${props.singularEntityName}`}
                onClick={() => {
                  deleteGeneric(name);
                }}
              >
                <strong>&times;</strong>
              </Center>
            </div>
          }
        />
      ))}
      {proposedName !== undefined
      ? <div>
          <div
            // FIXME: use a transparent input instead of content editable
            contentEditable
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
                if (e.currentTarget.innerText.trim() === "")
                  e.currentTarget.innerText = "invalid name"
              }
            }}
            ref={proposedNameInputRef}
            // FIXME: just don't finalize if invalid
            onBlur={(e) => {
              const value = e.currentTarget.innerText.trim();
              finishProposedGeneric(value || "invalid name")
              if (keyBeingEdited) {
                props.onRename?.(keyBeingEdited, value);
              }
            }}
          >
            {proposedName}
          </div>
        </div>
      : <div
          data-tut-id="generic-proj-data-add-button"
          title={`Add a new ${props.singularEntityName}`}
          {...classNames(styles.newButton, "alternis__hoverable")}
          onClick={() => setProposedName("")}
        >
          <Center>+</Center>
        </div>
      }
    </div>
  );
}

export namespace GenericEditor {
  export interface Props<T extends SupportedKeys> {
    singularEntityName: string;
    docPropKey: T;
    newInitialVal: AppState["document"][T][string] | (() => AppState["document"][T][string]);
    // FIXME: use correct react type that supports all possible components impls
    extraActions?: React.FunctionComponent<{
      data: AppState["document"][T][string];
      set: (data: Partial<AppState["document"][T][string]>) => void;
    }>;
    noDrag?: boolean;
    onClick?(key: string, t: T, e: React.MouseEvent<HTMLSpanElement>): void;
    getTitle?(key: string, t: T): string;
    onRename?(oldKey: string, newKey: string): void;
  }
}
