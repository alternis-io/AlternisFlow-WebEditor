import React from "react";
import { ContextMenuOptions } from "../components/ContextMenu";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";
import styles from "../TestGraphEditor.module.css"
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import { BaseNodeData } from "./data";

export const BaseNode = (props: BaseNode.Props) => {
  const data = getNode<BaseNodeData>(props.id)?.data;
  const set = makeNodeDataSetter<BaseNodeData>(props.id);

  const [isEditing, setIsEditing] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);

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
      <div
        className={styles.node}
        style={{ width: "max-content" }}
        title={
          "The 'Dialogue Entry' node, has a participant say a particular line.\n"
          + "The line may be locked by a true/false variable."
        }
      >
        {props.children}
        {showMore && props.showMoreContent}
        {showMore &&
          <label title="the label for jump nodes">
            label
            <input
              className="nodrag"
              onChange={(e) => set({ label: e.currentTarget.value || undefined })}
              value={data.label}
            />
          </label>
        }
        <Center
          {...classNames(styles.entryNodeShowMoreIndicator, "hoverable")}
          onClick={() => setShowMore(prev => !prev)}
        >
          <strong style={{ transform: "scale(2, 0.8)", display: "block", width: "100%", textAlign: "center" }}>
            <svg
              viewBox="-5 -5 15 15"
              height="15px" width="30px"
              strokeWidth={"2px"}
              strokeLinecap="round"
              style={{
                transform: showMore ? "scale(1, -1)" : undefined, stroke: "white", fill: "none"
              }}
              className={"hoverable"}
            >
              <path d="M0 0 l5 5 l5 -5" />
            </svg>
          </strong>
        </Center>
      </div>

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
    showMoreContent?: React.ReactNode;
  }
}
