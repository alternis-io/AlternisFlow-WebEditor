import React, { useEffect, useRef, useState } from "react";
import { AppState, useAppState } from "./AppState";
import "./shared.global.css";
import * as styles from "./GateEditor.module.css";
import { Center } from "./Center";
import { classNames } from "./react-utils";
import { Split } from "./Split";

// all keys that are a simple record
type SupportedKeys = "constants" | "gates" | "events";

export function GenericEditor<T extends SupportedKeys>(
  props: GenericEditor.Props<T>
) {
  const generic = useAppState((s) => s.document[props.docPropKey]);
  const set = useAppState((s) => s.set);

  const [proposedName, setProposedName] = useState<string>();

  const setGeneric = (name: string, value: AppState["document"][T][string] = props.newInitialVal) => set(s => ({
    document: {
      ...s.document,
      [props.docPropKey]: {
        ...s.document.constants,
        [name]: value,
      },
    },
  }));

  const addGeneric = setGeneric;

  const deleteGeneric = (name: string) => set(s => {
    const generic = { ...s.document.constants };
    delete generic[name];
    return {
      document: {
        ...s.document,
        [props.docPropKey]: generic,
      },
    };
  });

  const proposedNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (proposedName === "")
      proposedNameInputRef.current?.focus();
  }, [proposedName]);

  const finishProposedGeneric = (value: string) => {
    addGeneric(value);
    setProposedName(undefined);
  };

  return (
    <div style={{
      display: "grid",
      gap: "11px",
    }}>
      {Object.entries(generic).map(([name, data]) => (
        <Split
          left={
            <span onDoubleClick={(e) => {
              //make it editable somehow?
            }}>
              {name}
            </span>
          }
          right = {
            <div style={{display: "flex", flexDirection: "row"}}>
              <Center
                className="hoverable"
                title={`Delete this ${props.singularEntityName}`}
                onClick={(e) => {
                  deleteGeneric(name);
                }}
              >
                <em>&times;</em>
              </Center>
            </div>
          }
        />
      ))}
      {proposedName !== undefined
      ? <div>
          <input
            ref={proposedNameInputRef}
            value={proposedName}
            onChange={(e) => setProposedName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finishProposedGeneric(e.currentTarget.value);
              }
            }}
            onBlur={(e) => finishProposedGeneric(e.currentTarget.value)}
          />
        </div>
      : <div
          title={`Add a new ${props.singularEntityName}`}
          {...classNames(styles.newButton, "hoverable")}
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
  }
}
