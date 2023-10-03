import React, { useMemo } from "react";
import { ContextMenuOptions } from "../components/ContextMenu";
import { UniqueInput } from "../components/UniqueInput";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";
import styles from "../TestGraphEditor.module.css"
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import { BaseNodeData } from "./data";

export const BaseNode = (props: BaseNode.Props) => {
  const data = getNode<BaseNodeData>(props.id)?.data;
  const set = makeNodeDataSetter<BaseNodeData>(props.id);
  const nodes = useAppState(s => s.document.nodes);
  const otherLabeledNodes = useMemo(() => nodes.filter((n) => n.data?.label && n.id !== props.id), [nodes]);
  const takenLabels = useMemo(() => otherLabeledNodes.map(n => n.data.label as string), [otherLabeledNodes]);

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
        data-tut-id={data.label && `node-${data.label}`}
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
            <UniqueInput
              initialValue={data.label}
              takenSet={takenLabels}
              style={{ maxWidth: 100 }}
              className="nodrag"
              onChange={(s) => set({ label: s || undefined })}
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
