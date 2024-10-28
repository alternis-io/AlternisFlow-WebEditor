import React, { useMemo } from "react";
import { ContextMenuOptions } from "../components/ContextMenu";
import { UniqueInput } from "../components/UniqueInput";
import { getNode, makeNodeDataSetter, useCurrentDialogue, useAppState, useCurrentDocument } from "../AppState";
import styles from "../TestGraphEditor.module.css"
import { useDialogueContextFromJson } from "../DialogueViewer"
import playbackStyles from "../DialogueViewer.module.css"
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";
import { BaseNodeData } from "./data";
import type { NodeTypes } from "../TestGraphEditor";

const FloatingTools = (props: {
  id: string;
  type: NodeTypes;
  data: BaseNodeData;
  set: ReturnType<typeof makeNodeDataSetter<BaseNodeData>>
}) => {
  const nodes = useCurrentDialogue(s => s.nodes);
  const otherLabeledNodes = useMemo(() => nodes.filter((n) => n.data?.label && n.id !== props.id), [nodes]);
  const takenLabels = useMemo(() => otherLabeledNodes.map(n => n.data.label as string), [otherLabeledNodes]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // FIXME: definitely broken in the presence of disconnected nodes
  const nodeIndex = React.useMemo(() => nodes.findIndex(n => n.id === props.id), [nodes, props.id]);

  const dialogueCtx = useDialogueContextFromJson();
  const currentDialogueId = useAppState(s => s.currentDialogueId);
  const dialogues = useCurrentDocument(d => d.dialogues);
  const dialogueIndex = Object.keys(dialogues).findIndex(d => d === currentDialogueId);

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      {/* FIXME: exported ids are not yet stable so disabling for now */}
      {(false && (props.type === "dialogueEntry" || props.type === "playerReplies")) && (
        <button
          title={"Start playback from this node"}
          onClick={() => {
            if (nodeIndex !== undefined)
              dialogueCtx?.reset(dialogueIndex, nodeIndex);
          }}
          {...classNames(styles.nodeLabelFocusButton, "alternis__hoverable")}
        >
          <svg height="15px" width="15px" viewBox="-3 -3 16 16">
            <path {...classNames(playbackStyles.playButton, "alternis__hover")}
              d="M0 0 l0 10 l10 -5 l-10 -5" />
          </svg>
        </button>
      )}
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
        title={`Click to set this node's label (#${props.id})`}
        onClick={() => {
          inputRef.current?.focus();
        }}
        {...classNames(styles.nodeLabelFocusButton, "alternis__hoverable")}
        style={{ display: props.data.label ? "none" : undefined}}
      >
        #
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
      onSelect: () => useCurrentDialogue.setState(s => ({
        nodes: s.nodes.filter(n => n.id !== id)
      })),
    }
  ], []);

  // reactflow seems to render dead nodes sometimes? Or I do?
  return data ? (
    <>
      <div
        data-tut-id={data.label && `node-${data.label}`}
        {...divProps}
        {...classNames(styles.node, divProps.className)}
        style={{ width: "max-content", ...divProps.style }}
      >
        <FloatingTools id={props.id} type={props.type as NodeTypes} data={data} set={set} />
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
              <div className="alternis__split" key={key}>
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
      <ContextMenuOptions options={nodeContextMenuOpts} />
    </>
  ) : null;
};

export namespace BaseNode {
  export interface Props extends React.PropsWithChildren<{}>, React.HTMLProps<HTMLDivElement> {
    id: string;
    type: NodeTypes;
    showMoreContent?: React.ReactNode;
    noMetadata?: boolean;
    noLabel?: boolean;
  }
}
