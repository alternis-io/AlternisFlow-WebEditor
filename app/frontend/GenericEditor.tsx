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

  const [proposedName, setProposedName] = useState<string>();

  const setGeneric = (name: string, value: Partial<AppState["document"][T][string]> = props.newInitialVal) => set(s => ({
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
  }));

  const addGeneric = setGeneric;

  const deleteGeneric = (name: string) => set(s => {
    const generic = { ...s.document[props.docPropKey] };
    delete generic[name];
    return {
      document: {
        ...s.document,
        [props.docPropKey]: generic,
      },
    };
  });

  const proposedNameInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (proposedName === "")
      proposedNameInputRef.current?.focus();
  }, [proposedName]);

  const finishProposedGeneric = (value: string) => {
    addGeneric(value);
    setProposedName(undefined);
  };

  const ExtraActions = props.extraActions ?? ((_p: any) => null);

  return (
    <div style={{
      display: "grid",
      gap: "11px",
    }}>
      {Object.entries(generic).map(([name, data]) => (
        <Split
          key={name}
          left={
            <span
              title={
                `Double-click to edit.\n`
                + "Drag into the graph to add a call node.\n"
                + "Functions are callbacks into the environment that "
                + "can invoke custom functionality during a dialogue."
              }
              className="alternis__hoverable"
              onDoubleClick={() => {
                deleteGeneric(name);
                setProposedName(name);
                proposedNameInputRef.current?.focus();
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: props.docPropKey,
                  data,
                  id: name,
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
              draggable={"true"}
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
            onBlur={(e) => finishProposedGeneric(e.currentTarget.innerText.trim() || "invalid name")}
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
    newInitialVal: AppState["document"][T][string];
    // FIXME: use correct react type that supports all possible components impls
    extraActions?: React.FunctionComponent<{
      data: AppState["document"][T][string];
      set: (data: Partial<AppState["document"][T][string]>) => void;
    }>;
  }
}
