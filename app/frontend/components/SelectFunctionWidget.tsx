import React from "react";
import { RespGrid } from "./RespGrid";
import { useAppState } from "../AppState";
import { classNames } from "js-utils/lib/react-utils";
import { useOnExternalClick } from "@bentley/react-hooks";

// TODO: standardize the name... is it an event or a function? focus group some writers+non/coders+game devs
// NOTE: I have a suspicion that "event" is easier to understand?
export function SelectFunctionWidget(props: SelectFunctionWidget.Props) {
  const functions = useAppState(s => s.document.functions);

  const {
    onSelectFunction: _1,
    getTitle: _3,
    onExternalClick: _4,
    onDragFunctionEnd: _5,
    ...divProps
  } = props;
  
  // FIXME: fix emit terminology
  const getTitle = props.getTitle
    ?? ((name: string) => name + `\nClick (or drag) to place a emit event for this function`);

  const rootElem = React.useRef<HTMLDivElement>(null);

  useOnExternalClick(rootElem, props.onExternalClick ?? (() => {}));

  return (
    <div className="alternis__floatingbox" ref={rootElem} {...divProps}>
      <strong>Pick a function</strong>
      <div
        style={{
          height: "max-content",
          minWidth: 200,
          width: "fit-content",
          overflow: "scroll",
          marginTop: "var(--gap)"
        }}
      >
        {Object.entries(functions).map(([eventName, _data]) => (
          <div
            key={eventName}
            // FIXME: note that center's display:flex breaks text-overflow
            {...classNames("alternis__hoverable", "alternis__draggable")}
            onClick={() => props.onSelectFunction?.(eventName)}
            title={getTitle(eventName)}
          >
            <div
              draggable
              onDragStart={(e) => {
                console.log("started!")
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: "functions",
                  data: _data,
                  id: eventName,
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={(e) => props.onDragFunctionEnd?.(eventName, e)}
            >
              {eventName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export namespace SelectFunctionWidget {
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    onSelectFunction?(eventName: string): void;
    getTitle?(eventName: string): string;
    onExternalClick?(): void;
    onDragFunctionEnd?(eventName: string, evt: React.DragEvent<HTMLDivElement>): void;
  }
}
