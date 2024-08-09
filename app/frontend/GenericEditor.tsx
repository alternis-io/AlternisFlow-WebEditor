import React, { useEffect, useRef, useState } from "react";
import { Document, useAppState, useCurrentDocument } from "./AppState";
import "./shared.global.css";
import styles from "./GenericEditor.module.css";
import { Center } from "./Center";
import { classNames } from "js-utils/lib/react-utils";
import { Split } from "./Split";
import { docs } from "./api/usePouchDbApi";

// all keys that are a simple record
type SupportedKeys = "variables" | "functions" | "dialogues";

export function GenericEditor<T extends SupportedKeys>(
  inProps: GenericEditor.Props<T>
) {
  // FIXME: must be in sync with props interface
  const { singularEntityName, docPropKey, newInitialVal, extraActions, noDrag, onClickEntryName, getTitle, onRename, onAdd, disallowDeleteLast, ...divProps } = inProps;
  const props = { singularEntityName, docPropKey, newInitialVal, extraActions, noDrag, onClickEntryName, getTitle, onRename, onAdd, disallowDeleteLast };

  const doc = useCurrentDocument();
  const generic = doc[props.docPropKey];

  const [keyBeingEdited, setKeyBeingEdited] = React.useState<string>();
  const [proposedName, setProposedName] = useState<string>();

  const defaultSetGenericValue = typeof props.newInitialVal === "function"
    ? props.newInitialVal()
    : props.newInitialVal;

  const setGeneric = React.useCallback(async (
    name: string,
    value: Partial<Document[T][string]>,
  ) => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
    const doc = await docs.get(docId);
    await docs.put({
      ...doc,
      [props.docPropKey]: {
        ...doc[props.docPropKey],
        [name]: {
          ...doc[props.docPropKey][name],
          ...value,
        },
      },
    });
  }, [props.docPropKey]);

  const addGeneric = React.useCallback(
    (name: string) => setGeneric(name, defaultSetGenericValue),
    [setGeneric, defaultSetGenericValue],
  );

  const replaceGeneric = React.useCallback(async (
    oldName: string,
    newName: string,
  ) => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
    const doc = await docs.get(docId);
    const old = doc[props.docPropKey][oldName];
    delete doc[props.docPropKey][oldName];
    await docs.put({
      ...doc,
      [props.docPropKey]: {
        ...doc[props.docPropKey],
        [newName]: old,
      },
    });
  }, [props.docPropKey]);

  const deleteGeneric = React.useCallback(async (name: string) => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
    const doc = await docs.get(docId);
    const generic = { ...doc[props.docPropKey] };
    delete generic[name];
    await docs.put({
      ...doc,
      [props.docPropKey]: generic,
    });
  }, [props.docPropKey]);

  const proposedNameInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (proposedName === "" || proposedName === keyBeingEdited) {
      proposedNameInputRef.current?.focus();
      // FIXME: use select once this ref is an input
    }
  }, [proposedName]);

  const finishProposedGeneric = async (value: string) => {
    if (keyBeingEdited !== undefined) {
      await replaceGeneric(keyBeingEdited, value);
      setKeyBeingEdited(undefined);
    } else {
      await addGeneric(value);
      props.onAdd?.(value);
    }
    setProposedName(undefined);
  };

  const ExtraActions = props.extraActions ?? React.useRef((_p: any) => null).current;

  React.useLayoutEffect(() => {
    if (proposedNameInputRef.current && proposedName !== undefined)
      proposedNameInputRef.current.textContent = proposedName;
  }, [proposedName]);

  const entries = Object.entries(generic);

  return (
    <div
      {...divProps}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "11px",
        ...divProps.style,
      }}
    >
      {entries
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
              onClick={(e) => props.onClickEntryName?.(name, data as T, e)}
              draggable={!props.noDrag}
            >
              {name}
            </span>
          }
          right={
            !props.disallowDeleteLast || entries.length > 1
              ? (
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: "3px" }}>
                  <ExtraActions
                    data={data as any}
                    set={(d: Partial<Document[T][string]>) => setGeneric(name, d)}
                  />
                  <Center
                    className="alternis__hoverable alternis__hoverable-red"
                    title={`Delete this ${props.singularEntityName}`}
                    onClick={async () => {
                      await deleteGeneric(name);
                    }}
                  >
                    <strong>&times;</strong>
                  </Center>
                </div>
              )
              : <span/>
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
            onBlur={async (e) => {
              const value = e.currentTarget.innerText.trim();
              await finishProposedGeneric(value || "invalid name")
              if (keyBeingEdited) {
                props.onRename?.(keyBeingEdited, value);
              }
            }}
          />
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
  export interface Props<T extends SupportedKeys> extends React.HTMLProps<HTMLDivElement> {
    singularEntityName: string;
    docPropKey: T;
    newInitialVal: Document[T][string] | (() => Document[T][string]);
    // FIXME: use correct react type that supports all possible components impls
    extraActions?: React.FunctionComponent<{
      data: Document[T][string];
      set: (data: Partial<Document[T][string]>) => void;
    }>;
    disallowDeleteLast?: boolean;
    noDrag?: boolean;
    onClickEntryName?(key: string, t: T, e: React.MouseEvent<HTMLSpanElement>): void;
    getTitle?(key: string, t: T): string;
    onRename?(oldKey: string, newKey: string): void;
    /** code to run after a user creates a new key */
    onAdd?(key: string): void;
  }
}
