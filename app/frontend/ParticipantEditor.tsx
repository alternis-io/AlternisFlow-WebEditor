import React, { useCallback, useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { Participant } from "../common/data-types/participant";
import { ContextMenu } from "./components/ContextMenu";
import { AppState, IconSizes, useAppState } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";

export namespace ProjectDataEditor {
  export interface Props {}
}

// prepopulate during loading...
const testParticipants: Record<string, Participant> = Object.fromEntries(new Array(100).fill(undefined).map((_, i) => ([
  `test_${i}`,
  {
    name: `test_${i}`,
    // FIXME: make my own
    portraitUrl: "https://www.svgrepo.com/show/166448/portrait.svg"
  }
])));

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
  const [{ participants, preferences }, setAppState] = useAppState((s) => ({
    participants: s.document.participants,
    preferences: s.preferences.participantEditor,
  }));
  //const participants = {} as any;
  //const preferences = { iconSizes: "medium" } as any;

  const selectedId = preferences.lastSelected;
  const setSelectedId = (val: string) => setAppState((s) => s.preferences.participantEditor.lastSelected = val);
  const selected = selectedId && participants[selectedId];

  const [name, nameInput, setNameInput, nameStatus, nameStatusMessage] = useValidatedInput("", {
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
        <input value={nameInput} onChange={(e) => setNameInput(e.currentTarget.value)} />
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
              <div key={name} onClick={() => setAppState((s) => s.preferences.participantEditor.iconSize = name as IconSizes)}>
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
              iconSizes?.[preferences.iconSize]?.styles ?? {
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

