import React, { useEffect, useState } from "react";
import styles from "./ParticipantEditor.module.css";
import { Participant } from "../common/data-types/participant";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
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

type IconSize = keyof typeof iconSizes;

const isIconSize = (t: any): t is IconSize => t in iconSizes;

export function ParticipantEditor() {
  const contextMenuId = String(Math.random());

  const [iconSize, setIconSize] = useState<keyof typeof iconSizes>(persistentData.participantEditor.preferences.iconSize);

  useEffect(() => {
    persistentData.participantEditor.preferences.iconSize = iconSize;
  }, [iconSize]);

  return (
    <div>
      <ContextMenuTrigger id={contextMenuId}>
        <div>
          <div className={styles.selectionGrid}>
            {participants.map(participant => 
              // FIXME: make a default portrait pic
              <div
                key={participant.name}
                className={styles.portraitImage}
                style={{
                  borderRadius: "5px",
                  boxSizing: "border-box",
                  border: "1px solid black",
                  ...iconSizes?.[iconSize]?.styles ?? {
                    height: "50px",
                    width: "50px",
                  },
                }}
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
      </ContextMenuTrigger>

      <ContextMenu id={contextMenuId}>
        {/* FIXME: add a real context menu component */}
        <div style={{ backgroundColor: "white", color: "black" }}>
        {Object.entries(iconSizes).map(([name, iconSize]) => 
          <MenuItem key={name} onClick={() => setIconSize(name)}> Make icons {iconSize.label} </MenuItem>
        )}
        </div>
      </ContextMenu>
    </div>
  );
}

