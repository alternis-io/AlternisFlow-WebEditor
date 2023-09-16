import React, { useEffect, useRef, useState } from "react";
import { useAppState } from "./AppState";
import "./shared.global.css";
import * as styles from "./GateEditor.module.css";
import { Center } from "./Center";
import { classNames } from "./react-utils";
import { Split } from "./Split";

export function GateEditor() {
  const gates = useAppState((s) => s.document.gates);
  const set = useAppState((s) => s.set);

  const [proposedGateName, setProposedGateName] = useState<string>();

  const setGate = (name: string, value: (typeof gates)[string]) => set(s => ({
    document: {
      ...s.document,
      gates: {
        ...s.document.gates,
        [name]: value,
      },
    },
  }));

  const addGate = setGate;

  const deleteGate = (name: string) => set(s => {
    const gates = { ...s.document.gates };
    delete gates[name];
    return {
      document: {
        ...s.document,
        gates,
      },
    };
  });

  const proposedNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (proposedGateName === "")
      proposedNameInputRef.current?.focus();
  }, [proposedGateName]);

  const finishProposedGate = (value: string) => {
    addGate(value, { initial: "locked" });
    setProposedGateName(undefined);
  };

  return (
    <div style={{
      display: "grid",
      gap: "11px",
    }}>
      {Object.entries(gates).map(([name, data]) => (
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
              <input
                title={data.initial}
                checked={data.initial === "locked"}
                // NOTE: use custom checkbox with lock symbol
                type="checkbox"
                onChange={() => setGate(name, { initial: data.initial === "locked" ? "unlocked" : "locked" })}
              />
              <Center
                className="hoverable"
                title="Delete this gate"
                onClick={(e) => {
                  deleteGate(name);
                }}
              >
                <em>&times;</em>
              </Center>
            </div>
          }
        />
      ))}
      {proposedGateName !== undefined
      ? <div>
          <input
            ref={proposedNameInputRef}
            value={proposedGateName}
            onChange={(e) => setProposedGateName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finishProposedGate(e.currentTarget.value);
              }
            }}
            onBlur={(e) => finishProposedGate(e.currentTarget.value)}
          />
        </div>
      : <div
          {...classNames(styles.newButton, "hoverable")}
          onClick={() => setProposedGateName("")}
        >
          <Center>+</Center>
        </div>
      }
    </div>
  );
}

