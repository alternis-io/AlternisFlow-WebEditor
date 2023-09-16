import React, { useEffect, useRef, useState } from "react";
import { AppState, useAppState } from "./AppState";
import "./shared.global.css";
import * as styles from "./GenericEditor.module.css";
import { Center } from "./Center";
import { classNames } from "./react-utils";
import { Split } from "./Split";

// all keys that are a simple record
type SupportedKeys = "constants" | "gates" | "events";

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

  const proposedNameInputRef = useRef<HTMLInputElement>(null);

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
            <span onDoubleClick={(e) => {
              //make it editable somehow?
            }}>
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
                className="hoverable"
                title={`Delete this ${props.singularEntityName}`}
                onClick={() => {
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
    // FIXME: use correct react type that supports all possible components impls
    extraActions?: React.FunctionComponent<{
      data: AppState["document"][T][string];
      set: (data: Partial<AppState["document"][T][string]>) => void;
    }>;
  }
}
