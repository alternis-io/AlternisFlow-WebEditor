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

  const { id, children, showMoreContent, noLabel, ...divProps } = props;

  const [showMore, setShowMore] = React.useState(false);

  const nodeContextMenuOpts: ContextMenuOptions.Option[] = React.useMemo(() => [
    {
      id: "delete",
      onSelect: () => useAppState.setState(s => ({
        document: {
          ...s.document,
          nodes: s.document.nodes.filter(n => n.id !== id)
        },
      })),
    }
  ], []);

  // reactflow seems to render dead nodes sometimes? Or I do?
  return data ? (
    <div {...divProps}>
      <ContextMenuOptions options={nodeContextMenuOpts} />
      <div
        className={styles.node}
        style={{ width: "max-content" }}
      >
        {children}
        {(showMoreContent || !noLabel) && 
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
        }
        {showMore && showMoreContent}
        {showMore && !noLabel &&
          <label title="The label that can be used by jump nodes">
            label
            <input
              style={{ maxWidth: 100 }}
              className="nodrag"
              onChange={(e) => set({ label: e.currentTarget.value || undefined })}
              value={data.label}
            />
          </label>
        }
      </div>
    </div>
  ) : null;
};

export namespace BaseNode {
  export interface Props extends React.PropsWithChildren<{}>, React.HTMLProps<HTMLDivElement> {
    id: string;
    showMoreContent?: React.ReactNode;
    noLabel?: boolean;
  }
}
