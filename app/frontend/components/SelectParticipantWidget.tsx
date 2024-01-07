import React from "react";
import styles from "../ParticipantEditor.module.css";
import { RespGrid } from "./RespGrid";
import { useAppState } from "../AppState";
import { classNames } from "js-utils/lib/react-utils";
import { Participant } from "../../common/data-types/participant";
import { useOnExternalClick } from "@bentley/react-hooks";

export function SelectParticipantWidget(props: SelectParticipantWidget.Props) {
  const participants = useAppState(s => s.document.participants);

  const {
    onSelectParticipant: _1,
    getTitle: _3,
    onExternalClick: _4,
    onDragParticipantEnd: _5,
    ...divProps
  } = props;
  
  const getTitle = props.getTitle
    ?? ((p: Participant, _i: number) => p.name + `\nClick (or drag) to place a new line from this participant`);

  const rootElem = React.useRef<HTMLDivElement>(null);

  useOnExternalClick(rootElem, props.onExternalClick ?? (() => {}));

  return (
    <div className="alternis__floatingbox" ref={rootElem} {...divProps}>
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
                onClick={() => props.onSelectParticipant?.(p, i)}
                title={getTitle(p, i)}
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
                  onDragEnd={(e) => props.onDragParticipantEnd?.(p, i, e)}
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
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    onSelectParticipant?(p: Participant, index: number): void;
    getTitle?(p: Participant): string;
    onExternalClick?(): void;
    onDragParticipantEnd?(p: Participant, index: number, evt: React.DragEvent<HTMLImageElement>): void;
  }
}
