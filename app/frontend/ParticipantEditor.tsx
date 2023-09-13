import React, { useCallback, useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { ContextMenu } from "./components/ContextMenu";
import { IconSizes, useAppState } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";
import { usePrevValue, useWithPrevDepsEffect } from "./hooks/usePrevValue";
import { assert } from "./browser-utils";

export namespace ProjectDataEditor {
  export interface Props {}
}

export const iconSizes = {
  small: {
    label: "small",
    styles: {
      paddingBottom: "10%",
      height: "0",
      width: "10%",
    },
  },
  medium: {
    label: "medium",
    styles: {
      paddingBottom: "20%",
      height: "0",
      width: "20%",
    },
  },
  large: {
    label: "large",
    styles: {
      paddingBottom: "50%",
      height: "0",
      width: "50%",
    },
  },
} as const;

export function ParticipantEditor() {
  const participants = useAppState((s) => s.document.participants);
  const editorPrefs = useAppState((s) => s.preferences.participantEditor);
  const set = useAppState((s) => s.set);

  const setIconSize = (val: IconSizes) => set((s) => ({
    preferences: {
      ...s.preferences,
      participantEditor: {
        ...s.preferences.participantEditor,
        iconSize: val
      },
    },
  }));

  const selectedName = editorPrefs.lastSelected;
  const selected = selectedName !== undefined ? participants[selectedName] : undefined;

  const [name, nameInput, setNameInput, nameStatus, nameStatusMessage] = useValidatedInput(selected?.name ?? "", {
    validate: useCallback((text: string) => {
      if (text === selectedName)
        return { valid: true };
      if (!text)
        return { valid: false, status: "Participant can't have an empty name"}
      if (participants[text] !== undefined)
        return { valid: false, status: "A participant with that name already exists" };
      return { valid: true };
    }, [participants]),
  });

  useEffect(() => {
    if (name === null || !selectedName || selectedName === name)
      return;

    const prevName = selectedName;
    // svelte please
    set(s => {
      return {
        preferences: {
          ...s.preferences,
          participantEditor: {
            ...s.preferences.participantEditor,
            lastSelected: name,
          },
        },
        document: {
          ...s.document,
          participants: {
            ...s.document.participants,
            [prevName]: undefined,
            [name]: {
              ...s.document.participants[prevName],
              name,
            },
          }
        },
      };
    }
  );

  }, [name, selectedName]);

  const setSelectedName = (val: string) => {
    set((s) => ({
      preferences: {
        ...s.preferences,
        participantEditor: {
          ...s.preferences.participantEditor,
          lastSelected: val,
        },
      },
    }));
    setNameInput(val);
  };


  const details = (
    <div>
      <h1> Details </h1>
      {selected ? <>
        <label>
          Participant name
          <input
            defaultValue={selectedName}
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
          />
        </label>
        <div style={{color: "#f00"}}> { nameStatus !== "success" && nameStatusMessage } </div>
        <div>{name ?? selected.name}</div>
        </> : <>
          Select a participant to see and edit them
        </>
      }
    </div>
  );

  return (
    <div>
      <h1> Participants </h1>
      <div className={styles.selectionGrid}>
        <ContextMenu>
          <div style={{ backgroundColor: "white", color: "black" }}>
            {Object.entries(iconSizes).map(([name, iconSize]) => 
              <div key={name} onClick={() => setIconSize(name as IconSizes)}>
                Make icons {iconSize.label}
              </div>
            )}
          </div>
        </ContextMenu>
        {Object.entries(participants).map(([id, participant]) => 
          // FIXME: make a default portrait pic
          participant && <div
            key={id}
            className={styles.portraitImage}
            onClick={() => setSelectedName(id)}
            style={
              iconSizes?.[editorPrefs.iconSize]?.styles ?? {
                height: "50px",
                width: "50px",
              }
            }
            >
            <img src={participant.portraitUrl} alt={participant.name} />
          </div>
        )}
      </div>

      {details}
    </div>
  );
}

