import React from "react";
import styles from "../ParticipantEditor.module.css";
import { useAppState } from "../AppState";
import { classNames } from "js-utils/lib/react-utils";

export function SelectParticipantWidget(props: SelectParticipantWidget.Props) {
  const participants = useAppState(s => s.document.participants);

  return (
    <div>
      <strong>Pick a participant</strong>
      <div style={{ height: 400, width: 300, overflow: "scroll" }}>
        {participants.map((p, i) =>
          <div
            key={p.name}
            // FIXME: note that center's display:flex breaks text-overflow
            {...classNames(styles.portraitImage, "alternis__hoverable", "alternis__draggable", "alternis__center")}
            onClick={props.onSelect}
            title={p.name + `\nClick to edit. Drag and drop into the graph to add a line node`}
          >
            <img
              src={p.portraitUrl}
              alt={p.name}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: "participants",
                  data: p,
                  id: String(i),
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export namespace SelectParticipantWidget {
  export interface Props {
    onSelect?(): void;
  }
}
