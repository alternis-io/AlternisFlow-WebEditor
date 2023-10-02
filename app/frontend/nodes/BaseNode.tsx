import React from "react";
import { ContextMenuOptions } from "../components/ContextMenu";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";

export interface BaseNodeData {
  label: string | undefined;
}

export const BaseNode = (props: BaseNode.Props) => {
  const data = getNode<BaseNodeData>(props.id)?.data;
  const set = makeNodeDataSetter<BaseNodeData>(props.id);

  const [isEditing, setIsEditing] = React.useState(false);

  const editableElemRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (isEditing && editableElemRef.current) {
      editableElemRef.current.focus();
    }
  }, [isEditing]);

  const nodeContextMenuOpts: ContextMenuOptions.Option[] = React.useMemo(() => [
    {
      id: "delete",
      onSelect: () => useAppState.setState(s => ({
        document: {
          ...s.document,
          nodes: s.document.nodes.filter(n => n.id !== props.id)
        },
      })),
    }
  ], []);

  // reactflow seems to render dead nodes sometimes? Or I do?
  return data ? (
    <div>
      <ContextMenuOptions options={nodeContextMenuOpts} />
      {props.children}
      {/*
      <div
        title={data.label === undefined ? "add node label" : "edit node label"}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          borderRadius: "50%",
          width: "10px",
          height: "10px",
        }}
        onClick={() => setIsEditing(prev => !prev)}
      >
        edit
      </div>
      */}
      <span
        style={{
          position: "absolute",
          top: 0,
          right: 0,
        }}
      >
        {
          <span
            contentEditable
            ref={editableElemRef}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              minWidth: 150,
            }}
            onFocus={(e) => {
              if (e.currentTarget.firstElementChild?.tagName === "HR") {
                e.currentTarget.innerHTML = "";
              }
            }}
            onBlur={(e) => {
              if (e.currentTarget.innerText.trim() === "") {
                set({ label: undefined });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          >
            {data.label || "..."}
          </span>
        }
      </span>
    </div>
  ) : null;
};

export namespace BaseNode {
  export interface Props extends React.PropsWithChildren<{}> {
    id: string;
  }
}
