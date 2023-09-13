import React, { useCallback, useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { ContextMenu } from "./components/ContextMenu";
import { IconSizes, useAppState } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";

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
  const setSelectedId = (val: string) => set((s) => ({
    preferences: {
      ...s.preferences,
      participantEditor: {
        ...s.preferences.participantEditor,
        lastSelected: val,
      },
    },
  }));
  const setIconSize = (val: IconSizes) => set((s) => ({
    preferences: {
      ...s.preferences,
      participantEditor: {
        ...s.preferences.participantEditor,
        iconSize: val
      },
    },
  }));
                

  const selectedId = editorPrefs.lastSelected;
  const selected = selectedId !== undefined ? participants[selectedId] : undefined;

  const [name, nameInput, setNameInput, nameStatus, nameStatusMessage] = useValidatedInput(selected?.name ?? "", {
    // FIXME: this is bad, this can accidentally swap state with another character that you match names with
    validate: useCallback((text: string) => {
      return {
        valid: !(text in participants),
        status: "A participant with that name already exists",
      };
    }, [participants]),
  });

  useEffect(() => {
    if (name != null && selectedId)
      participants[selectedId].name = name;
  }, [name, participants, selectedId]);

  const details = (
    <div>
      <h1> Details </h1>
      {selected ? <>
        <label>
          Participant name
          <input defaultValue={selected.name} value={nameInput} onChange={(e) => setNameInput(e.currentTarget.value)} />
        </label>
        <span style={{color: "#f00"}}> { nameStatus !== "success" && nameStatusMessage } </span>
        <div>{selected.name}</div>
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
          <div
            key={id}
            className={styles.portraitImage}
            onClick={() => setSelectedId(id)}
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

