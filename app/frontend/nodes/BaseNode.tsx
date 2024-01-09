import React, { useMemo } from "react";
import { ContextMenuOptions } from "../components/ContextMenu";
import { UniqueInput } from "../components/UniqueInput";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";
import styles from "../TestGraphEditor.module.css"
import playbackStyles from "../DialogueViewer.module.css"
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import { BaseNodeData } from "./data";

const FloatingTools = (props: {
  id: string;
  data: BaseNodeData;
  set: ReturnType<typeof makeNodeDataSetter<BaseNodeData>>
}) => {
  const nodes = useAppState(s => s.document.nodes);
  const otherLabeledNodes = useMemo(() => nodes.filter((n) => n.data?.label && n.id !== props.id), [nodes]);
  const takenLabels = useMemo(() => otherLabeledNodes.map(n => n.data.label as string), [otherLabeledNodes]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: "flex" }}>
      <button
        // FIXME: should only work on line nodes
        // FIXME: not implemented
        title={"Click to test playback starting from this node"}
        onClick={() => {}}
        className={styles.nodeLabelFocusButton}
      >
        <svg height="15px" width="15px" viewBox="-3 -3 16 16">
          <path {...classNames(playbackStyles.playButton, "alternis__hover")}
            d="M0 0 l0 10 l10 -5 l-10 -5" />
        </svg>
      </button>
      <div className="alternis__floatup">
        <UniqueInput
          initialValue={props.data.label}
          takenSet={takenLabels}
          style={{ width: props.data.label ? "fit-content" : 5 }}
          className="nodrag"
          onChange={(s) => props.set({ label: s || undefined })}
          inputClassName={styles.nodeLabelInput}
          ref={inputRef}
        />
      </div>
      <button
        title={"Click to edit this node's label"}
        onClick={() => {
          inputRef.current?.focus();
        }}
        className={styles.nodeLabelFocusButton}
        style={{ display: props.data.label ? "none" : undefined}}
      >
        {"•••"}
      </button>
    </div>
  );
};

export const BaseNode = (props: BaseNode.Props) => {
  const data = getNode<BaseNodeData>(props.id)?.data;
  const set = makeNodeDataSetter<BaseNodeData>(props.id);
  const takenCustomDataKeys = useMemo(() => data?.customData?.map(([k]) => k) ?? [], [data?.customData]);

  const { id, children, showMoreContent, noLabel, noMetadata: noCustomData, ...divProps } = props;

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
        <FloatingTools id={props.id} data={data} set={set} />
        {children}
        {(showMoreContent || !noLabel) && 
          <Center
            title="Click to toggle details"
            {...classNames(styles.entryNodeShowMoreIndicator, "alternis__hoverable")}
            onClick={() => setShowMore(prev => !prev)}
          >
            <strong style={{ /*transform: "scale(2, 0.8)",*/ display: "block", width: "100%", textAlign: "center" }}>
              <svg
                viewBox="-5 -5 15 15"
                height="15px" width="30px"
                strokeWidth={"2px"}
                strokeLinecap="round"
                style={{
                  transform: showMore ? "scale(1, -1)" : undefined, stroke: "white", fill: "none"
                }}
                className={"alternis__hoverable"}
              >
                <path d="M0 0 l5 5 l5 -5" />
              </svg>
            </strong>
          </Center>
        }
        {showMore && showMoreContent}
        {showMore && !noCustomData &&
          <div>
            <div>
              <label className="alternis__split">
                <span title="Set custom key/value pairs for this node">custom properties</span>
                {/* FIXME: remove */}
                <button
                  title="Add a new custom property to this node"
                  {...classNames("alternis__hoverable", "alternis__toolBtn", "alternis__newButton" )}
                  onClick={() => {
                    set((prev) => ({
                      // FIXME: get unique key
                      customData: (prev.customData ?? [])
                        .concat([[`property${(prev.customData?.length ?? 0) + 1}`, "value"]])
                    }));
                    // FIXME: imperatively focus the last input
                  }}
                >
                  <Center>+</Center>
                </button>
              </label>
            </div>
            {data.customData?.map(([key, value], i) =>
              // FIXME grid + gap
              <div className="alternis__split">
                <UniqueInput
                  initialValue={key}
                  // FIXME: probably very inefficient... might consider memoizing this
                  takenSet={takenCustomDataKeys.filter(k => k !== key)}
                  style={{ maxWidth: 100 }}
                  className="nodrag"
                  onChange={(s) => set(prev => ({
                    customData: prev.customData?.map(([k,v], j) => [j === i ? s : k,v])
                  }))}
                  valueLabel="property"
                />
                <input
                  value={value}
                  onChange={(e) => set(prev => ({
                    customData: prev.customData?.map(([k,v], j) => [k, j === i ? e.currentTarget.value : v])
                  }))}
                />
              </div>
            )}
          </div>
        }
      </div>
    </div>
  ) : null;
};

export namespace BaseNode {
  export interface Props extends React.PropsWithChildren<{}>, React.HTMLProps<HTMLDivElement> {
    id: string;
    showMoreContent?: React.ReactNode;
    noMetadata?: boolean;
    noLabel?: boolean;
  }
}
