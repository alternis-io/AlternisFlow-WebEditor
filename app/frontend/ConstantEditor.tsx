import React, { useEffect, useRef, useState } from "react";
import { useAppState } from "./AppState";
import "./shared.global.css";
import * as styles from "./GateEditor.module.css";
import { Center } from "./Center";
import { classNames } from "./react-utils";
import { Split } from "./Split";

export function ConstantEditor() {
  const constants = useAppState((s) => s.document.constants);
  const set = useAppState((s) => s.set);

  const [proposedConstantName, setProposedConstantName] = useState<string>();

  const setConstant = (name: string, value: (typeof constants)[string] = { type: "string" }) => set(s => ({
    document: {
      ...s.document,
      constants: {
        ...s.document.constants,
        [name]: value,
      },
    },
  }));

  const addConstant = setConstant;

  const deleteConstant = (name: string) => set(s => {
    const constants = { ...s.document.constants };
    delete constants[name];
    return {
      document: {
        ...s.document,
        constants,
      },
    };
  });

  const proposedNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (proposedConstantName === "")
      proposedNameInputRef.current?.focus();
  }, [proposedConstantName]);

  const finishProposedConstant = (value: string) => {
    addConstant(value);
    setProposedConstantName(undefined);
  };

  return (
    <div style={{
      display: "grid",
      gap: "11px",
    }}>
      {Object.entries(constants).map(([name, data]) => (
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
                title="Delete this constant"
                onClick={(e) => {
                  deleteConstant(name);
                }}
              >
                <em>&times;</em>
              </Center>
            </div>
          }
        />
      ))}
      {proposedConstantName !== undefined
      ? <div>
          <input
            ref={proposedNameInputRef}
            value={proposedConstantName}
            onChange={(e) => setProposedConstantName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finishProposedConstant(e.currentTarget.value);
              }
            }}
            onBlur={(e) => finishProposedConstant(e.currentTarget.value)}
          />
        </div>
      : <div
          title="Add a new constant"
          {...classNames(styles.newButton, "hoverable")}
          onClick={() => setProposedConstantName("")}
        >
          <Center>+</Center>
        </div>
      }
    </div>
  );
}

