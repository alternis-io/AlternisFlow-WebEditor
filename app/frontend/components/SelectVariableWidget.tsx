import React from "react";
import { RespGrid } from "./RespGrid";
import { useAppState } from "../AppState";
import { classNames } from "js-utils/lib/react-utils";
import { useOnExternalClick } from "@bentley/react-hooks";

export function SelectVariableWidget(props: SelectVariableWidget.Props) {
  const variables = useAppState(s => s.document.variables);

  const {
    onSelectVariable: _1,
    getTitle: _3,
    onExternalClick: _4,
    onDragVariableEnd: _5,
    header: _6,
    ...divProps
  } = props;

  // FIXME: fix emit terminology
  const getTitle = props.getTitle
    ?? ((name: string) => name + `\nDrag text variables into text to add to that text.\nDrag and drop true/false variables to make a lock node`);

  const rootElem = React.useRef<HTMLDivElement>(null);

  useOnExternalClick(rootElem, props.onExternalClick ?? (() => {}));

  const variableEntries = React.useMemo(() => Object.entries(variables), [variables]);

  return (
    <div className="alternis__floatingbox" ref={rootElem} {...divProps}>
      <strong>{props.header ?? "Pick a variable"}</strong>
      <div
        style={{
          height: "max-content",
          minWidth: 200,
          width: "fit-content",
          overflow: "scroll",
          marginTop: "var(--gap)"
        }}
      >
        {variableEntries.map(([eventName, _data]) => (
          <div
            key={eventName}
            // FIXME: note that center's display:flex breaks text-overflow
            {...classNames("alternis__hoverable", "alternis__draggable")}
            onClick={() => props.onSelectVariable?.(eventName)}
            title={getTitle(eventName)}
          >
            <div
              draggable
              onDragStart={(e) => {
                console.log("started!")
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: "variables",
                  data: _data,
                  id: eventName,
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={(e) => props.onDragVariableEnd?.(eventName, e)}
            >
              {eventName}
            </div>
          </div>
        ))}
        {variableEntries.length === 0 && <span>You haven't added a variable yet</span>}
      </div>
    </div>
  );
}

export namespace SelectVariableWidget {
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    onSelectVariable?(eventName: string): void;
    getTitle?(eventName: string): string;
    onExternalClick?(): void;
    onDragVariableEnd?(eventName: string, evt: React.DragEvent<HTMLDivElement>): void;
    header?: string;
  }
}
