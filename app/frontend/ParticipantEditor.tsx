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
      minHeight: "20px",
      maxHeight: "8%",
      minWidth: "20px",
      maxWidth: "8%",
    },
  },
  medium: {
    label: "medium",
    styles: {
      minHeight: "50px",
      maxHeight: "20%",
      minWidth: "50px",
      maxWidth: "20%",
    },
  },
  large: {
    label: "large",
    styles: {
      minHeight: "150px",
      maxHeight: "50%",
      minWidth: "150px",
      maxWidth: "50%",
    },
  },
} as const;

type IconSize = keyof typeof iconSizes;

const isIconSize = (t: any): t is IconSize => t in iconSizes;

export function ParticipantEditor() {
  const contextMenuId = String(Math.random());
  // FIXME: store in local storage

  const [iconSize, setIconSize] = useState<keyof typeof iconSizes>(persistentData.participantEditor.preferences.iconSize);

  useEffect(() => {
    persistentData.participantEditor.preferences.iconSize = iconSize;
  }, [iconSize]);

  console.log(iconSize);
  console.log(iconSizes?.[iconSize].value ?? "50px");

  return (
    <div>
      <ContextMenuTrigger id={contextMenuId}>
        <div>
          <div className={styles.selectionGrid}>
            {participants.map(participant => 
              <img key={participant.name} style={{
                color: "red",
                ...iconSizes?.[iconSize].styles ?? {
                  height: "50px",
                  width: "50px",
                },
              }} alt={participant.name} />
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
        {Object.entries(iconSizes).map(([name, iconSize]) => 
          <MenuItem key={name} onClick={() => setIconSize(iconSize)}> Make icons {iconSize.label} </MenuItem>
        )}
      </ContextMenu>
    </div>
  );
}

