import React, { useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { Participant } from "../common/data-types/participant";
import { ContextMenu } from "./components/ContextMenu";
import { persistentData } from "./AppPersistentState";
import { useValidatedInput } from "@bentley/react-hooks";

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

type IconSizes = keyof typeof iconSizes;
type IconSizeData = (typeof iconSizes)[IconSizes];

const isIconSize = (t: any): t is IconSizes => t in iconSizes;

export function ParticipantEditor() {
  const [iconSize, setIconSize] = useState<keyof typeof iconSizes>(persistentData.participantEditor.preferences.iconSize);
  const [participants, setParticipants] = useState(testParticipants);
  const [selectedId, setSelected] = useState(persistentData.participantEditor.preferences.selected);

  useEffect(() => {
    persistentData.participantEditor.preferences.iconSize = iconSize;
  }, [iconSize]);

  const [name, nameInput, setNameInput, nameStatus, nameStatusMessage] = useValidatedInput();

  const selected = selectedId && participants[selectedId];

  const details = (
    <div>
      <h1> Details </h1>
      {selected ? <>
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
            onClick={() => setSelected(id)}
            style={
              iconSizes?.[iconSize]?.styles ?? {
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

