import React from "react";
import styles from "../ParticipantEditor.module.css";
import { RespGrid } from "./RespGrid";
import { useAppState } from "../AppState";
import { classNames } from "js-utils/lib/react-utils";

export function SelectParticipantWidget(props: SelectParticipantWidget.Props) {
  const participants = useAppState(s => s.document.participants);

  return (
    <div className="alternis__floatingbox">
      <strong>Pick a participant</strong>
      <div style={{ height: "max-content", width: 300, overflow: "scroll", marginTop: "var(--gap)" }}>
        <RespGrid
          size={"small"}
          cells={
            participants.map((p, i) => ({
              "key": p.name,
              content: <div
                key={p.name}
                // FIXME: note that center's display:flex breaks text-overflow
                {...classNames(styles.portraitImage, "alternis__hoverable", "alternis__draggable", "alternis__center")}
                onClick={props.onSelect}
                title={p.name + `\nClick (or drag) to place a new line said by this participant`}
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
            }))
          }
        />
      </div>
    </div>
  );
}

export namespace SelectParticipantWidget {
  export interface Props {
    onSelect?(): void;
  }
}
