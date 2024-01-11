import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Handle,
  NodeProps,
  Controls,
  MiniMap,
  EdgeProps,
  getMarkerEnd,
  getBezierPath,
  useReactFlow,
  MarkerType,
  BaseEdge,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  HandleProps,
  ConnectionMode,
  SelectionMode,
  Background,
  useNodes,
  useUpdateNodeInternals,
  Position,
  BackgroundVariant,
  Panel,
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { Link, useLocation } from "react-router-dom";
import { baseUrl, useApi } from "./hooks/useApi";
import { classNames, deepCloneJson } from 'js-utils/lib/react-utils'
import { Center } from "./Center";
import { getNode, makeNodeDataSetter, useAppState, AppState, resetAllAppState } from "./AppState";
import { ReactComponent as LockIcon } from "./images/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./images/inkscape-unlock.svg";
import defaultParticipantIconUrl from "./images/participant-icon.svg";
import { ContextMenu, ContextMenuOptions, Options } from './components/ContextMenu'
import { SelectParticipantWidget } from './components/SelectParticipantWidget'
import { SelectFunctionWidget } from './components/SelectFunctionWidget'
import { TransparentSelect } from './components/TransparentSelect'
import { assert } from 'js-utils/lib/browser-utils'
import { useOnExternalClick, useValidatedInput } from '@bentley/react-hooks'
import { InputStatus } from './hooks/useValidatedInput'
import { useReactFlowClipboard } from './hooks/useReactFlowClipboard'
import debounce from "lodash.debounce";
import * as jsonpatch from "fast-json-patch";

import { GotoNode } from './nodes';
import { NodeHandle } from './nodes/handle';
import { BaseNode } from './nodes/BaseNode';
import { DialogueEntry, Emit, Lock, RandomSwitch, PlayerReplies, PlayerReply, defaultRandomSwitchProps, defaultPlayerRepliesProps } from './nodes/data';
import { Tutorial1 } from './Tutorial1';
import { DialogueViewer } from './DialogueViewer';
import downloadFile, { uploadFile } from './localFileManip';
import { exportToJson } from './export';

const forceAddNodeEvent = "force-addnode";

// FIXME: rename to Line node
const DialogueEntryNode = (props: NodeProps<DialogueEntry>) => {
  const node = getNode<DialogueEntry>(props.id);

  const data = node?.data;
  const participants = useAppState((s) => s.document.participants);
  const participant = useAppState((s) =>
    data?.speakerIndex !== undefined
    ? s.document.participants[data.speakerIndex]
    : undefined
  );
  const set = makeNodeDataSetter<DialogueEntry>(props.id);

  const textInput = React.useRef<HTMLTextAreaElement>(null);

  // FIXME: focusing while loading reactflow seems to cause unalignment of the renderer
  // React.useEffect(() => {
  //   textInput.current?.focus();
  // }, []);

  return !data ? null : (
    <BaseNode
      id={props.id}
      showMoreContent={<>
        <label>
          subtitle
          <input
            className="nodrag"
            onChange={(e) => set({ title: e.currentTarget.value })}
            value={data.title}
          />
        </label>
      </>}
    >
      <NodeHandle
        type="target"
        nodeId={props.id}
        index={0}
        position={Position.Left}
        className={styles.handle}
        isConnectable
      />
      {participant
        ? <>
          <div className={styles.nodeHeader}>
            <TransparentSelect
              style={{ maxWidth: 150, fontSize: "1em" }}
              value={data?.speakerIndex}
              title={"Click to change the speaker"}
              onChange={(e) => set({ speakerIndex: +e.currentTarget.value })}
            >
              {participants.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
            </TransparentSelect>
            <img height="80px" style={{ width: "auto" }} src={participant.portraitUrl} />
          </div>
          <label>
            text
            <textarea
              ref={textInput}
              className="nodrag"
              onChange={(e) => set({ text: e.currentTarget.value })}
              // FIXME: why not use a controlled component?
              value={data.text}
            />
          </label>
        </>
      : <> unknown participant </>
      }
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="source"
        position={Position.Right}
        className={styles.handle}
        isConnectable
      />
    </BaseNode>
  );
};

const LockNode = (props: NodeProps<Lock>) => {
  const variables = useAppState(s => s.document.variables);
  const bools = useMemo(() => Object.entries(variables).filter(([, v]) => v.type === "boolean"), [variables]);
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Lock>(props.id)?.data;
  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data?.action === "lock" ? LockIcon : UnlockIcon;

  const iconRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bools.length >= 1 && data?.variable === undefined) {
      set({ variable: bools[0][0] })
    }
  }, [bools, data?.variable]);

  // need to use a DOM callback to intercept contextmenu
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.button !== 2) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      set(({ action }) => ({ action: action === "lock" ? "unlock" : "lock" }));
      return false;
    };
    iconRef.current?.addEventListener("mousedown", handler, true);
    return () => iconRef.current?.removeEventListener("mousedown", handler, true);
  }, [set, iconRef.current]);

  return !data ? null : (
    <BaseNode
      data-tut-id="node-lock"
      id={props.id}
      title={
        "The 'Lock' node, changes the state of a gate.\n"
        + "Right click to change whether it locks or unlocks it"
      }
    >
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="target"
        position={Position.Left}
        className={styles.handle}
        isConnectable
      />
      <Center ref={iconRef}>
        <Icon
          style={{
            height: 80,
            width: 80,
            // TODO: style all of this SVG's elements... also fix the SVG itself
            stroke: "#000",
            strokeLinecap: "round",
          }}
          viewBox="-2 -2 85 112"
        />
      </Center>
      <label>
        variable
        <select
          title={bools.length === 0 ? "You must create a boolean variable to lock/unlock it" : undefined}
          value={data.variable}
          onChange={e => set(() => ({ variable: e.currentTarget.value }))}
        >
          {bools.map(([boolName]) => (
              <option key={boolName} value={boolName}>{boolName}</option>
          ))}
        </select>
      </label>
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="source"
        position={Position.Right}
        className={styles.handle}
        isConnectable
      />
    </BaseNode>
  )
};

const EmitNode = (props: NodeProps<Emit>) => {
  const functions = useAppState(s => s.document.functions);
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Emit>(props.id)?.data;
  const set = makeNodeDataSetter<Emit>(props.id);

  useEffect(() => {
    const functionNames = Object.keys(functions);
    if (Object.entries(functionNames).length >= 1 && data?.function === undefined) {
      set({ function: functionNames[0] })
    }
  }, [functions, data?.function]);

  return !data ? null : (
    <BaseNode
      data-tut-id="node-function"
      id={props.id}
      title={
        "The 'Function Call' node, triggers environment-registered handlers to run custom logic"
      }
    >
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="target"
        position={Position.Left}
        className={styles.handle}
        isConnectable
      />
      <Center>
        <span style={{ fontSize: "4rem", fontWeight: "bold" }}>!</span>
      </Center>
      <label>
        function
        <select
          value={data.function}
          onChange={e => set(() => ({ function: e.currentTarget.value }))}
          style={{ maxWidth: 150 }}
        >
          {Object.entries(functions)
            .map(([functionName]) => (
              <option key={functionName} value={functionName}>{functionName}</option>
            )
          )}
        </select>
      </label>
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="source"
        position={Position.Right}
        className={styles.handle}
        isConnectable
      />
    </BaseNode>
  )
};

const percentFmter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, style: "percent" });

const RandomSwitchInput = (props: {
  nodeId: string;
  totalProportion: number;
  proportion: number;
  index: number;
}) => {
  const { nodeId, totalProportion, proportion, index } = props;
  const set = makeNodeDataSetter<RandomSwitch>(props.nodeId);
  const [inputProportion, input, setInput, inputStatus, inputMessage] = useValidatedInput<number>(String(proportion));

  useEffect(() => {
    if (inputProportion === null)
      return;

    set(({ proportions }) => {
      const updatedList = proportions.slice();
      updatedList[index] = inputProportion;
      return {
        proportions: updatedList
      };
    });
  }, [inputProportion]);

  return (
    <div key={index} className={styles.randomSwitchInput}>
      <input
        title={inputMessage ? inputMessage : undefined}
        className="nodrag"
        style={{
          outline: inputStatus !== InputStatus.Success
            ? "1px solid #ee2222"
            : undefined,
          width: "6em",
        }}
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
      />
      <span>
        ({percentFmter.format(proportion / totalProportion)})
      </span>
      {/* FIXME align the close button to the right */}
      <Center
          className="alternis__hoverable alternis__hoverable-red"
          title="Delete this possibility"
          onClick={() => index !== 0 && set(s => {
            const proportions = s.proportions.slice();
            proportions.splice(index, 1); // remove
            return { proportions };
          })}
        >
          <strong>&times;</strong>
        </Center>
      <NodeHandle
        nodeId={nodeId}
        index={index}
        type="source"
        position={Position.Right}
        className={styles.inlineHandle}
        isConnectable
      />
    </div>
  );
};

const RandomSwitchNode = (props: NodeProps<RandomSwitch>) => {
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<RandomSwitch>(props.id)?.data;
  const totalProportion = data?.proportions.reduce((prev, curr) => prev + curr, 0) ?? 1;
  const set = makeNodeDataSetter<RandomSwitch>(props.id);
  const updateNodeInternals = useUpdateNodeInternals();

  const nodeBodyRef = React.useRef<HTMLDivElement>(null);

  const doFocusLastInput = React.useRef(false);

  // NOTE: focusing while loading reactflow seems to cause unalignment of the renderer
  React.useEffect(() => {
    if (!doFocusLastInput.current)
      return;
    doFocusLastInput.current = false;

    const nodeBody = nodeBodyRef.current;
    if (!nodeBody) return;
    const inputs = nodeBody.querySelectorAll("input");
    const lastInput = inputs[inputs.length - 1];
    if (!lastInput) return;
    lastInput.focus();
  }, [data?.proportions.length]);

  return !data ? null : (
    <BaseNode
      id={props.id}
      data-tut-id="node-random-switch"
      title={
        "The 'Random Switch' node picks a random output.\n"
        + "Each output has a number of chances compared out of the total to be reached. "
        + "You can see the exact chance in each option's calculated percentage."
      }
    >
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="target"
        position={Position.Left}
        className={styles.handle}
        isConnectable
      />
      <div className={styles.randomSwitchBody} ref={nodeBodyRef}>
        <Center>
          <strong style={{ fontSize: "2rem" }}>?</strong>
        </Center>
        {data.proportions.map((proportion, index) => (
          <RandomSwitchInput
            key={index}
            nodeId={props.id}
            proportion={proportion}
            totalProportion={totalProportion}
            index={index}
          />
        ))}
        <div
          title="Add a possibility"
          {...classNames("alternis__newButton", "alternis__hoverable")}
          onClick={() => {
            set((s) => ({
              proportions: s.proportions.concat(1),
            }));
            updateNodeInternals(props.id);
            doFocusLastInput.current = true;
          }}
        >
          <Center>+</Center>
        </div>
      </div>
    </BaseNode>
  );
};

// FIXME: replace with the lock icon but crossed-out
const AddLockIcon = (props: { width?: number, height?: number }) => <div
  style={{
    borderRadius: "50%",
    border: "2px solid var(--fg-1)",
    height: props.height,
    width: props.width,
  }}
/>;

const ReplyLock = (props: {
  keyPrefix?: React.Key;
  reply: PlayerReply;
  set: (s: Partial<PlayerReply> | ((s: PlayerReply) => Partial<PlayerReply>)) => void;
  index: number;
}) => {
  const variables = useAppState(s => s.document.variables);
  const bools = useMemo(() => Object.entries(variables).filter(([, v]) => v.type === "boolean"), [variables]);
  const Icon
    = props.reply.condition === "none"
    ? AddLockIcon
    : props.reply.condition === "unlocked"
    ? UnlockIcon
    : LockIcon;

  return (
    <>
      <Center
        key={`${props.keyPrefix ?? ""}-lockicon`}
        className="alternis__hoverable"
        {...props.reply.condition === "none"
          ? {
            title: bools.length > 0
              // FIXME: rewrite these tooltips
              ? "Click to condition this reply on a boolean variable being locked (false)\n(cycles through conditions)"
              : "Add a boolean variable to set a condition",
            onClick: () => {
              // FIXME: error toast on no available bool variables? Or just hide this entirely?
              // or even offer to create a new variable then and there...
              if (bools.length <= 0) return;
              const [firstBoolVarName] = bools[0];
              props.set({
                lockVariable: firstBoolVarName,
                condition: "locked",
              });
            },
          } : props.reply.condition === "locked" ? {
            title: "Click to condition this reply on a boolean variable being unlocked (true)",
            onClick: () => {
              props.set({
                condition: "unlocked",
              });
            },
          } : /* props.reply.lockAction === "unlock" */ {
            title: "Click to remove conditions from this reply",
            onClick: () => {
              props.set({
                lockVariable: undefined,
                condition: "none",
              });
            },
          }
        }
      >
        <Icon width="1em" height="1em" />
      </Center>
      <select
        key={`${props.keyPrefix ?? ""}-lockselect`}
        value={props.reply.lockVariable}
        onChange={(e) => props.set({ lockVariable: e.currentTarget.value })}
        style={{
          maxWidth: 150,
          // can't use "display: none" or the grid is broken
          ...props.reply.condition === "none"
            ? { opacity: 0, width: 0, padding: 0, margin: 0 }
            : { opacity: 1 },
        }}
      >
        {bools.map(([varName]) => (
          <option key={varName} value={varName}>{varName}</option>
        ))}
      </select>
    </>
  );
}

const PlayerRepliesNode = (props: NodeProps<PlayerReplies>) => {
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<PlayerReplies>(props.id)?.data;
  const set = makeNodeDataSetter<PlayerReplies>(props.id);
  const updateNodeInternals = useUpdateNodeInternals();
  const participants = useAppState(s => s.document.participants);
  const speaker = useMemo(
    () => props.data.speaker !== undefined
      ? participants[props.data.speaker]
      : undefined,
    [participants, props.data.speaker]
  );

  const nodeBodyRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (participants.length >= 1 && data?.speaker === undefined) {
      set({ speaker: 0 })
    }
  }, [participants, data?.speaker]);


  const doFocusLastInput = React.useRef(false);

  // NOTE: focusing while loading reactflow seems to cause unalignment of the renderer
  React.useEffect(() => {
    if (!doFocusLastInput.current)
      return;
    doFocusLastInput.current = false;

    const nodeBody = nodeBodyRef.current;
    if (!nodeBody) return;
    const inputs = nodeBody.querySelectorAll("input");
    const lastInput = inputs[inputs.length - 1];
    if (!lastInput) return;
    lastInput.focus();
  }, [data?.replies.length]);

  return !data ? null : (
    <BaseNode
      id={props.id}
      data-tut-id="node-reply"
      title={
        "The 'Replies' node gives a participant the option to choose from multiple options.\n"
        + "Each output has a number of chances compared out of the total to be reached. "
        + "You can see the exact chance in each option's calculated percentage."
      }
    >
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="target"
        position={Position.Left}
        className={styles.handle}
        isConnectable
      />
      <label style={{ marginBottom: "var(--gap)" }}>
        Replier
        <select
          title={participants.length === 0 ? "You must add at least one participant to use them as in a reply" : undefined}
          value={speaker?.name}
          onChange={e => set(() => ({ speaker: +e.currentTarget.value }))}
          style={{ maxWidth: 150 }}
        >
          {participants.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
          ))}
        </select>
      </label>
      <div className={styles.playerRepliesBody} ref={nodeBodyRef}>
        {data.replies.map((reply, index) => (
          <React.Fragment key={index}>
            <input
              key={`input-${index}`}
              value={reply.text}
              onChange={(e) => {
                set(({ replies }) => {
                  const updated = replies.slice();
                  updated[index] = {
                    ...updated[index],
                    text: e.currentTarget.value,
                  };
                  return {
                    replies: updated
                  };
                });
              }}
            />
            <ReplyLock
              key={`replylock-${index}`}
              keyPrefix={`replylock-${index}`}
              reply={reply}
              set={(s) => set((prevReplies) => {
                const nextReplies = prevReplies.replies.slice();
                nextReplies[index] = {
                  ...prevReplies.replies[index],
                  ...typeof s === "function" ? s(prevReplies.replies[index]) : s,
                };
                return { replies: nextReplies };
              })}
              index={index}
            />
            <Center
              key={`delete-${index}`}
              className="alternis__hoverable alternis__hoverable-red"
              title="Delete this option"
              onClick={() => index !== 0 && set(s => {
                const replies = s.replies.slice();
                replies.splice(index, 1);
                return { replies };
              })}
              style={{
                // hide close on first reply
                ...index === 0
                  // can't use "display: none" or the grid is broken
                  ? { opacity: 0, width: 0, padding: 0, margin: 0 }
                  : { opacity: 1, width: undefined },
              }}
            >
              <strong>&times;</strong>
            </Center>
            <NodeHandle
              key={`handle-${index}`}
              nodeId={props.id}
              index={index}
              type="source"
              position={Position.Right}
              className={styles.inlineHandle}
              isConnectable
            />
          </React.Fragment>
        ))}
        <div
          title="Add a reply option"
          {...classNames("alternis__newButton", "alternis__hoverable")}
          onClick={() => {
            set((s) => ({
              replies: s.replies.concat({ text: "", condition: "none", lockVariable: undefined }),
            }));
            updateNodeInternals(props.id);
            doFocusLastInput.current = true;
          }}
        >
          <Center>+</Center>
        </div>
      </div>
    </BaseNode>
  );
};

const UnknownNode = (props: NodeProps<{}>) => {
  // TODO: store connections on data in case the correct type is restored
  // FIXME: log to support immediately
  return (
    <BaseNode
      id={props.id}
      title="This is an error. Please contact support"
      noLabel
    >
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </BaseNode>
  );
};

// FIXME: can be deleted
const EntryNode = (props: NodeProps<{}>) => {
  return (
    <div
      //id={props.id}
      className={styles.node}
      // FIXME: for a particular participant
      title="The node that defines the beginning of the dialogue"
      //noLabel
    >
      <Center style={{ padding: 5 }}>
        <strong>Start</strong>
      </Center>
      <NodeHandle
        nodeId={props.id}
        index={0}
        type="source"
        position={Position.Right}
        className={styles.handle}
        isConnectable
      />
    </div>
  );
};

const nodeTypes = {
  //FIXME: rename to dialogue line?
  dialogueEntry: DialogueEntryNode,
  randomSwitch: RandomSwitchNode,
  playerReplies: PlayerRepliesNode,
  lockNode: LockNode,
  emitNode: EmitNode,
  entry: EntryNode,
  goto: GotoNode,
  default: UnknownNode,
};

export type NodeTypes = keyof typeof nodeTypes;

const nodeTypeNames: Record<NodeTypes, string> = {
  dialogueEntry: "Line",
  randomSwitch: "Random",
  playerReplies: "Player Replies",
  lockNode: "Lock",
  emitNode: "Emit",
  entry: "Entry",
  goto: "Goto",
  default: "Unknown",
};

const CustomEdge = (props: EdgeProps) => {
  const [edgePath] = getBezierPath({
    ...props,
    // HACK: tweak sizes
    // FIXME: check all platforms and screen sizes
    // FIXME: not aligned on relative-positioned handles
    //sourceX: props.sourceX + 5,
    //sourceY: props.sourceY + 5,
    //targetX: props.targetX + 5,
    //targetY: props.targetY + 5,
  });
  const markerEnd = getMarkerEnd(MarkerType.Arrow, props.markerEnd);

  const nodes = useNodes();
  const sourceNode = nodes.find(n => n.id === props.source);
  const targetNode = nodes.find(n => n.id === props.target);

  return <BaseEdge
    interactionWidth={20}
    path={edgePath}
    {...props}
    style={{strokeWidth: 2, ...props.style}}
    markerWidth={10}
    markerHeight={10}
    markerStart={MarkerType.ArrowClosed}
    markerEnd={MarkerType.ArrowClosed}
  />;
}

const edgeTypes = {
  default: CustomEdge,
} as const

function getNewId(nodes: { id: string }[]) {
  const maxId = nodes
    .map(n => +n.id)
    .filter(n => !Number.isNaN(n))
    .reduce((prev, cur) => prev > cur ? prev : cur, 0)
    ?? 0;
  return `${maxId + 1}`;
}

const addNode = (
  nodeType: keyof typeof nodeTypes,
  {
    initData = undefined,
    position = { x: 0, y: 0},
    connectingNodeId,
  }: {
    initData?: any;
    position?: {x: number, y:number}, 
    connectingNodeId?: { current?: string },
  } = {}
) => {
  useAppState.setState((s) => {
    const maybeSourceNode = connectingNodeId?.current;
    const newNodeId = getNewId(s.document.nodes);
    return {
      document: {
        ...s.document,
        nodes: s.document.nodes.concat({
          id: newNodeId,
          type: nodeType,
          data: {
            ...nodeType === "lockNode"
              ? {
                variable: Object.entries(s.document.variables).filter(([,v]) => v.type === "boolean")?.[0]?.[0],
                action: "lock",
              }
              : nodeType === "randomSwitch"
              ? deepCloneJson(defaultRandomSwitchProps)
              : nodeType === "emitNode"
              ? { function: Object.keys(s.document.functions)[0] } as Emit
              : nodeType === "playerReplies"
              ? deepCloneJson(defaultPlayerRepliesProps)
              : {},
            ...initData,
          },
          position,
        }),
        edges: maybeSourceNode !== undefined
          ? addEdge({
            id: getNewId(s.document.edges),
            source: maybeSourceNode,
            target: newNodeId,
          }, s.document.edges)
          : s.document.edges
      },
    };
  });
}

const ToolsPanel = () => {
  // FIXME: only one of these should show at a time ever...
  const [showParticipSelect, setShowParticipSelect] = React.useState(false);
  const [showFunctionSelect, setShowFunctionSelect] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <button
        style={{ width: 30, height: 30 }}
        title={"Select a participant to drag and drop a new line from"}
        className={"alternis__toolBtn alternis__center"}
        onClick={() => setShowParticipSelect(prev => !prev)}
      >
        <img width={20} style={{ objectFit: "contain" }} src={defaultParticipantIconUrl} />
      </button>
      {/* FIXME: need external clicks to close this */}
      {showParticipSelect && (
        <div style={{position: "absolute", top: "100%"}}>
          <SelectParticipantWidget
            getParticipantTitle={(p) => (p.name + `\nDrag into the editor to place a new line from this participant`)}
            onDragParticipantEnd={() => setShowParticipSelect(false)}
            header="Drag a participant"
          />
        </div>
      )}

      <button
        style={{ width: 30, height: 30, fontFamily: "serif" }}
        // FIXME: not implemented!
        title={"Add a variable expansion to the text of the selected node or drag to any node"}
        className={"alternis__toolBtn"}
      >
        <em><var style={{ fontSize: "20px", left: "-0.05em", bottom: "0.05em", position: "relative" }}>x</var></em>
      </button>

      <button
        style={{ width: 30, height: 30, fontFamily: "serif" }}
        // FIXME: not implemented!
        title={"Select a function node to drag and drop"}
        className={"alternis__toolBtn"}
        onClick={() => setShowFunctionSelect(prev => !prev)}
      >
        <em><var style={{ fontSize: "20px", left: "-0.1em", position: "relative" }}>f</var></em>
      </button>
      {/* TODO: better floating div implementation */}
      {showFunctionSelect && (
        <div style={{position: "absolute", top: "100%"}}>
          <SelectFunctionWidget
            getTitle={(name) => (name + `\nDrag into the editor to add a call node`)}
            onDragFunctionEnd={() => setShowFunctionSelect(false)}
            header="Drag a function"
          />
        </div>
      )}

    </div>
  );
};

const TopRightPanel = () => {
  return (
    <Panel position="top-right">
      <div>
        {!import.meta.env.PROD && (
          <>
            <button
              data-tut-id="export-dev-state-button"
              onClick={() => {
                downloadFile({
                  fileName: 'doc.name.json',
                  content: JSON.stringify(useAppState.getState().document, undefined, "  "),
                });
              }}
            >
              Dev State
            </button>
            <button
              onClick={async () => {
                const file = await uploadFile({ type: 'text' })
                const json = JSON.parse(file.content)
                // FIXME: validate state!
                useAppState.setState(json);
              }}
            >
              Import
            </button>
            <button
              onClick={async () => {
                resetAllAppState();
              }}
            >
              Reset
            </button>
            <br/>
          </>
        )}
        <button>
          Find
        </button>
        <button
          data-tut-id="export-button"
          onClick={() => {
            downloadFile({
              fileName: 'doc.alternis.json',
              content: JSON.stringify(exportToJson(useAppState.getState().document), undefined, "  "),
            });
          }}
        >
          Export
        </button>
      </div>
    </Panel>
  );
};

export const TestGraphEditor = (_props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useAppState(s => s.document.nodes);
  const edges = useAppState(s => s.document.edges);
  const permsVersion = useAppState(s => s.permissions.version);

  const [trialMessageShown, setTrialMessageShown] = useState(false);

  useEffect(() => {
    // FIXME: source this number from a common json file
    if (permsVersion === "trial" && nodes.length > 100)
      setTrialMessageShown(true);
  }, [nodes, permsVersion]);

  const docId = useAppState(s => s.document.id);
  const patchDocument = useApi(s => s.api.patchDocument);

  // FIXME: replace with middleware
  useEffect(() => {
    if (permsVersion === "trial")
      return;

    const syncRemote = async (curr: AppState, prev: AppState) => {
      await patchDocument(docId, prev, curr);
    };

    const debouncedSyncRemote = debounce(syncRemote, 3_000, { maxWait: 20_000 });

    const unsub = useAppState.subscribe((state, prevState) => {
      debouncedSyncRemote(state, prevState)
    });

    return unsub;
  }, [useAppState, docId, patchDocument]);


  // const dragBoxSelectMouseBinding = useAppState(s => s.preferences.graph.dragBoxSelectMouseBinding);
  const appendToSelectModifier = useAppState(s => s.preferences.graph.appendToSelectModifier);
  const dragPanMouseBinding = useAppState(s => s.preferences.graph.dragPanMouseBinding);
  const addNodeMouseBinding = useAppState(s => s.preferences.graph.addNodeMouseBinding);
  const enableBoxSelectOnDrag = useAppState(s => s.preferences.graph.enableBoxSelectOnDrag);

  const connectingNodeId = React.useRef<string>();
  const graphContainerElem = React.useRef<HTMLDivElement>(null);

  useReactFlowClipboard({ graphContainerElem });

  const editorRef = React.useRef<HTMLDivElement>(null);

  const trialMessage = (
    <dialog open={trialMessageShown}>
      <p>Thank you for trying <Link to={baseUrl}>Alternis</Link>!</p>
      <p>
        Please <Link to={"FIXME"}>sign up</Link> (only $10 a month) to
        use the full version!
      </p>
      <p> TODO a pretty advertisement with live cost data </p>
    </dialog>
  );

  // FIXME: do real query param parsing!
  const location = useLocation();
  const noHeaderRequested = location.search.includes("noHeader");

  // FIXME: useReducer?
  type ContextMenuState =
    | ["select-type", undefined]
    | ["select-participant", React.MouseEvent<HTMLDivElement> | undefined];
  const [[contextMenuState, contextMenuPayload], setContextMenuState] = React.useState<ContextMenuState>(["select-type", undefined])

  const contextMenuOptions = React.useMemo<ContextMenuOptions.Option[]>(() => [
    {
      id: "entry",
      label: "Add script line",
      onSelect(e) {
        setContextMenuState(["select-participant", e]);
      },
    },
    ...(Object.keys(nodeTypes) as (keyof typeof nodeTypes)[])
      .filter(key => key !== "entry" && key !== "default" && key !== "dialogueEntry")
      .map((nodeType) => ({
        id: nodeType,
        label: nodeTypeNames[nodeType],
        onSelect(e: React.MouseEvent<HTMLDivElement>) {
          const { top, left } = graphContainerElem.current!.getBoundingClientRect();
          addNode(nodeType, {
            position: graph.project({
              x: e.clientX - left - 150/2,
              y: e.clientY - top,
            }),
            connectingNodeId,
          });
          ctxMenuRef.current?.hide();
        },
      }))
  ], [graph, graphContainerElem, connectingNodeId]);

  const ctxMenuRef = React.useRef<ContextMenu.Ref>(null);

  const contextMenu = (
    <ContextMenu
      forceEventKey={forceAddNodeEvent}
      mouseBinding={addNodeMouseBinding}
      onHide={() => {
        connectingNodeId.current = undefined;
        setContextMenuState(["select-type", undefined]);
      }}
      ref={ctxMenuRef}
    >
      {contextMenuState === "select-type"
        ? (
          <Options
            className={styles.addNodeMenu}
            options={contextMenuOptions}
          />
        ) : (
          <SelectParticipantWidget
            //onDragStartDone={() => ctxMenuRef.current?.hide()}
            onSelectParticipant={(_p, index) => {
              const e = contextMenuPayload;
              assert(e !== undefined);
              const { top, left } = graphContainerElem.current!.getBoundingClientRect();
              addNode("dialogueEntry", {
                position: graph.project({
                  x: e.clientX - left - 150/2,
                  y: e.clientY - top,
                }),
                initData: {
                  speakerIndex: index,
                  text: "",
                },
                connectingNodeId: { current: undefined },
              });
              ctxMenuRef.current?.hide();
            }}
          />
        )
      }
    </ContextMenu>
  );

  return (
    <div ref={editorRef} className="alternis__rel-anchor alternis__propagate-size">
      {contextMenu}
      <div
        {...classNames(styles.graph, "alternis__propagate-size")}
        data-tut-id="graph"
        data-tut-inset
        ref={graphContainerElem}
        style={{ height: noHeaderRequested ? "100vh" : undefined }}
      >
        {trialMessage}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          deleteKeyCode={["Backspace", "Delete"]}
          // FIXME: need to filter illegal deletion changes here (e.g. no delete entry node)
          onNodesChange={(changes) => useAppState.setState(s => ({
            document: {
              ...s.document,
              nodes: applyNodeChanges(changes, s.document.nodes),
            },
          }))}
          onEdgesChange={(changes) => useAppState.setState(s => ({
            document: {
              ...s.document,
              edges: applyEdgeChanges(changes, s.document.edges),
            },
          }))}
          onConnect={(connection) => {
            useAppState.setState(s => ({
              document: {
                ...s.document,
                edges: addEdge(connection, s.document.edges),
              },
            }));
          }}
          snapToGrid
          snapGrid={[15, 15]}
          minZoom={0.1}
          maxZoom={1}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={(connection) => {
            const source = nodes.find(n => n.id === connection.source);
            const target = nodes.find(n => n.id === connection.target);
            const sourceType = connection.sourceHandle?.includes("source") ? "source" : "target";
            const targetType = connection.targetHandle?.includes("source") ? "source" : "target";
            if (!source || !target || !sourceType || !targetType) return true;
            return sourceType !== targetType && source !== target;
          }}
          connectionRadius={25}
          connectOnClick
          multiSelectionKeyCode={appendToSelectModifier}
          // FIXME: not good for laptops..., maybe we need a box select icon...
          panOnDrag={dragPanMouseBinding ? [dragPanMouseBinding.button] : false} // middle mouse, not great for laptops
          selectionOnDrag={enableBoxSelectOnDrag}
          selectionMode={SelectionMode.Partial}
          onDrop={(e) => {
            e.preventDefault();
            const participantDataText = e.dataTransfer.getData("application/alternis-project-data-item");
            if (participantDataText) {
              const { id, type } = JSON.parse(participantDataText);

              const [nodeType, nodeData]
                = type === "participants"
                ? ["dialogueEntry", {
                    speakerIndex: +id,
                    text: "",
                  }] as const
                // : type === "variables"
                // ? ["dialogueEntry", {
                //     speakerIndex: +id,
                //     text: "",
                //   } as DialogueEntry]
                : type === "gates"
                ? ["lockNode", {
                    variable: id,
                    action: "unlock",
                  }] as const
                : type === "functions"
                ? ["emitNode", {
                    function: id,
                  }] as const
                : assert(false) as never;

              const { top, left } = graphContainerElem.current!.getBoundingClientRect();

              // FIXME: better node width
              addNode(nodeType, {
                position: graph.project({
                  x: e.clientX - left - 150/2,
                  y: e.clientY - top,
                }), 
                initData: nodeData,
                connectingNodeId,
              });
            }
          }}
          onEdgeClick={(_evt, edge) => {
            graph.deleteElements({edges: [edge]})
          }}
          onConnectStart={(_, { nodeId }) => { connectingNodeId.current = nodeId ?? undefined; }}
          onConnectEnd={(e) => {
            const targetIsPane = (e.target as Element | undefined)?.classList?.contains('react-flow__pane');
            if (targetIsPane && graphContainerElem.current && editorRef.current) {
              const ctxMenuEvent = new CustomEvent(forceAddNodeEvent, e);
              (ctxMenuEvent as any).pageX = (e as MouseEvent).pageX;
              (ctxMenuEvent as any).pageY = (e as MouseEvent).pageY;
              editorRef.current.dispatchEvent(ctxMenuEvent);
            }
          }}
        >
          <Controls />
          {/* FIXME: can use custom icons to show e.g. lock nodes */}
          {/* FIXME: get color from global style variables */}
          <MiniMap
            zoomable pannable
            color="var(--fg-1)"
            // FIXME: node color should be  a function that returns based on types...
            maskColor="#2d2d2dcc" // FIXME: reference var(--bg-1)
            style={{
              backgroundColor: "var(--bg-2)",
            }}
          />
          <Background />

          <Panel position={"bottom-center"}>
            <DialogueViewer className={styles.dialogueViewer} />
          </Panel>

          <Panel position="top-left">
            <ToolsPanel />
          </Panel>

          <TopRightPanel />
        </ReactFlow>
      </div>
      <Tutorial1 />
    </div>
  );
}

namespace TestGraphEditor {
  export interface Props {}
}

export default TestGraphEditor

