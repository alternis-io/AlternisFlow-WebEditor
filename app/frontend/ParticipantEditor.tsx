import React, { useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { Participant } from "../common/data-types/participant";
import { ContextMenu } from "./components/ContextMenu";
import { persistentData } from "./AppPersistentState";

export namespace ProjectDataEditor {
  export interface Props {}
}

// prepopulate during loading...
const participants: Participant[] = new Array(100).fill().map((_, i) => ({
  name: `test_${i}`,
  portraitUrl: "nope"
}));

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

  useEffect(() => {
    persistentData.participantEditor.preferences.iconSize = iconSize;
  }, [iconSize]);

  return (
    <div>
      <ContextMenu>
        <div style={{ backgroundColor: "white", color: "black" }}>
          {Object.entries(iconSizes).map(([name, iconSize]) => 
            <div key={name} onClick={() => setIconSize(name as IconSizes)}>
              Make icons {iconSize.label}
            </div>
          )}
        </div>
      </ContextMenu>
      <div className={styles.selectionGrid}>
        {participants.map(participant => 
          // FIXME: make a default portrait pic
          <div
            key={participant.name}
            className={styles.portraitImage}
            style={
              iconSizes?.[iconSize]?.styles ?? {
                height: "50px",
                width: "50px",
              }
            }
            >
            <img
              alt={participant.name}
            />
          </div>
        )}
      </div>
      <div>
        tabs
        <span>speakers</span>
        <span>states</span>
      </div>
      <div>
        <span>speaker</span>
        <div>portrait</div>
        <div>name</div>
      </div>
    </div>
  );
}

