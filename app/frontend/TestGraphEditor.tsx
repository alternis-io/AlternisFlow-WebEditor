import React, { useEffect, useMemo } from 'react'
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
  ReactFlowProps,
  ReactFlowRefType,
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { useLocation } from "react-router-dom";
import { useApi } from "./api/useApi";
import { classNames, deepCloneJson } from 'js-utils/lib/react-utils'
import { Center } from "./Center";
import { Node, getNode, makeNodeDataSetter, useAppState, useCurrentDialogue, Document, resetAllAppState, Variable, useCurrentDocument } from "./AppState";
import { ReactComponent as LockIcon } from "./images/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./images/inkscape-unlock.svg";
import { ReactComponent as ExportIcon } from "./images/inkscape-export.svg";
import { ReactComponent as ImportIcon } from "./images/inkscape-import.svg";
import defaultParticipantIconUrl from "./images/participant-icon.svg";
import { ContextMenu, ContextMenuOptions, Options } from './components/ContextMenu'
import { SelectParticipantWidget } from './components/SelectParticipantWidget'
import { SelectFunctionWidget } from './components/SelectFunctionWidget'
import { SelectVariableWidget } from './components/SelectVariableWidget'
import { TransparentSelect } from './components/TransparentSelect'
import { NodeSearchBar } from "./components/NodeSearchBar";
import { assert } from 'js-utils/lib/browser-utils'
import { useValidatedInput } from '@bentley/react-hooks'
import { InputStatus } from './hooks/useValidatedInput'
import { useReactFlowClipboard } from './hooks/useReactFlowClipboard'
import debounce from "lodash.debounce";

import { GotoNode } from './nodes';
import { NodeHandle } from './nodes/handle';
import { BaseNode } from './nodes/BaseNode';
import { DialogueEntry, Emit, Lock, RandomSwitch, PlayerReplies, PlayerReply, defaultRandomSwitchProps, defaultPlayerRepliesProps } from './nodes/data';
import { Tutorial1 } from './Tutorial1';
import { DialogueViewer } from './DialogueViewer';
import downloadFile, { uploadFile } from './localFileManip';
import { exportToJson } from './export';
import { docs } from './api/usePouchDbApi';

const forceAddNodeEvent = "force-addnode";

// FIXME: rename to Line node
const DialogueEntryNode = (props: NodeProps<DialogueEntry>) => {
  const data = props?.data;
  const participants = useCurrentDocument((d) => d.participants);
  const participant
    = data?.speakerIndex !== undefined
    ? participants[data.speakerIndex]
    : undefined;
  const set = makeNodeDataSetter<DialogueEntry>(props.id);

  const textInput = React.useRef<HTMLTextAreaElement>(null);

  // FIXME: focusing while loading reactflow seems to cause unalignment of the renderer
  // React.useEffect(() => {
  //   textInput.current?.focus();
  // }, []);

  return !data ? null : (
    <BaseNode
      id={props.id}
      type="dialogueEntry"
      showMoreContent={
        <>
          <label>
            subtitle
            <input
              className="nodrag"
              onChange={(e) => set({ title: e.currentTarget.value })}
              value={data.title}
            />
          </label>
        </>
      }
      onDrop={(e) => {
        e.preventDefault();
        const dropDataText = e.dataTransfer.getData("application/alternis-project-data-item");
        if (!dropDataText) return;
        const { id, type, data } = JSON.parse(dropDataText);
        if (!(type === "variables" && (data as Variable).type === "string")) return;
        set(prev => ({ text: prev.text + `{${id}}` }));
      }}
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
            {/* FIXME: pretty sure the select becomes invalid when the participant is deleted... */}
            <TransparentSelect
              style={{ maxWidth: 150, fontSize: "1em" }}
              value={data?.speakerIndex}
              title={"Click to change the speaker"}
              className="nodrag"
              onChange={(e) => set({ speakerIndex: +e.currentTarget.value })}
            >
              {participants.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
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

// FIXME: rename to key node
const LockNode = (props: NodeProps<Lock>) => {
  const variables = useCurrentDocument(d => d.variables);
  const bools = useMemo(() => Object.entries(variables).filter(([, v]) => v.type === "boolean"), [variables]);

  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  //const data = getNode<Lock>(props.id)?.data;
  const data = props.data;

  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data?.action === "lock" ? LockIcon : UnlockIcon;

  const iconRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bools.length >= 1 && data?.variable === undefined) {
      set({ variable: bools[0][0] })
    }
  }, [bools, data?.variable]);

  const varRefIsValid = data?.variable && bools.find(b => b[0] === data.variable);

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

  const varOptions = React.useMemo(() =>
    [
      data?.variable ?? "INVALID",
      ...bools
        .map(([boolName]) => boolName)
        .filter(b => b !== data?.variable)
    ].map((boolName) => (<option key={boolName} value={boolName}>{boolName}</option>)),
    [data, bools],
  );

  return !data ? null : (
    <BaseNode
      data-tut-id="node-lock"
      type="lockNode"
      id={props.id}
      title={
        "The 'Lock' node, changes the state of a gate.\n"
        + "Right click to change whether it locks or unlocks it"
        + (varRefIsValid ? ""
          : bools.length === 0 ? "\n\nError: no true/false variables exist, create one"
          : "\n\nError: the selected variable does not exist, pick one")
      }
      {...classNames(varRefIsValid ? undefined : styles.errorOutline)}
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
          {varOptions}
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
  const functions = useCurrentDocument(d => d.functions);

  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  //const data = getNode<Emit>(props.id)?.data;
  const data = props.data;

  const set = makeNodeDataSetter<Emit>(props.id);

  useEffect(() => {
    const functionNames = Object.keys(functions);
    if (Object.entries(functionNames).length >= 1 && data?.function === undefined) {
      set({ function: functionNames[0] })
    }
  }, [functions, data?.function]);

  return !data ? null : (
    <BaseNode
      type="emitNode"
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

  // TODO: change this from an effect which may cause unnecessary rendering
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
  //const data = getNode<RandomSwitch>(props.id)?.data;
  const data = props.data;

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
      type="randomSwitch"
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
  const variables = useCurrentDocument(d => d.variables);
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
  // FIXME: looks like node ids get messed up between when switching dialogues
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  //const data = getNode<PlayerReplies>(props.id)?.data;
  const data = props.data;

  const set = makeNodeDataSetter<PlayerReplies>(props.id);
  const updateNodeInternals = useUpdateNodeInternals();
  const participants = useCurrentDocument(d => d.participants);

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
      type="playerReplies"
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
        <TransparentSelect
          title={participants.length === 0 ? "You must add at least one participant to use them as in a reply" : undefined}
          value={data.speaker}
          onChange={e => set(() => ({ speaker: +e.currentTarget.value }))}
          style={{ maxWidth: 150 }}
        >
          {participants.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
          ))}
        </TransparentSelect>
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
              onDrop={(e) => {
                e.preventDefault();
                const dropDataText = e.dataTransfer.getData("application/alternis-project-data-item");
                if (!dropDataText) return;
                const { id, type, data } = JSON.parse(dropDataText);
                if (!(type === "variables" && (data as Variable).type === "string")) return;
                set(prev => ({
                  replies: prev.replies.map((r, i) =>
                    i === index
                      ? { ...r, text: r.text + `{${id}}` }
                      : r
                  ),
                }));
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
      type="default"
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
    //markerWidth={10}
    //markerHeight={10}
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

const addNode = async (
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
  // gross pouchdb is making everything async...
  const docId = useAppState.getState().projectId;
  if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
  const document = await docs.get(docId);

  useCurrentDialogue.setState((s) => {
    const maybeSourceNode = connectingNodeId?.current;
    const newNodeId = getNewId(s.nodes);
    return {
      nodes: s.nodes.concat({
        id: newNodeId,
        type: nodeType,
        data: {
          ...nodeType === "lockNode"
            ? {
              variable: Object.entries(document.variables).filter(([,v]) => v.type === "boolean")?.[0]?.[0],
              action: "lock",
            }
            : nodeType === "randomSwitch"
            ? deepCloneJson(defaultRandomSwitchProps)
            : nodeType === "emitNode"
            ? { function: Object.keys(document.functions)[0] } as Emit
            : nodeType === "playerReplies"
            ? deepCloneJson(defaultPlayerRepliesProps)
            : {},
          ...initData,
        },
        position,
      }),
      edges: maybeSourceNode !== undefined
        ? addEdge({
          id: getNewId(s.edges),
          source: maybeSourceNode,
          target: newNodeId,
        }, s.edges)
        : s.edges
    };
  });
}

const ToolsPanel = () => {
  // FIXME: only one of these should show at a time ever...
  const currentDialogueId = useAppState(s => s.currentDialogueId);
  const [showSelect, setShowSelect] = React.useState<"participant" | "function" | "variable">();

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <>
        <button
          style={{ width: 30, height: 30 }}
          title={"Select a participant to drag and drop a new line from"}
          className={"alternis__toolBtn alternis__center alternis__hoverable"}
          onClick={() => setShowSelect(prev => prev === "participant" ? undefined : "participant")}
        >
          <img width={20} style={{ objectFit: "contain" }} src={defaultParticipantIconUrl} />
        </button>

        {/* FIXME: need external clicks to close this */}
        {showSelect === "participant" && (
          <div style={{position: "absolute", top: "100%"}}>
            <SelectParticipantWidget
              getParticipantTitle={(p) => (p.name + `\nDrag into the editor to place a new line from this participant`)}
              onDragParticipantEnd={() => setShowSelect(undefined)}
              header="Drag a participant"
            />
          </div>
        )}
      </>

      <>
        <button
          style={{ width: 30, height: 30, fontFamily: "serif" }}
          // FIXME: not implemented!
          title={"Add a variable expansion to the text of the selected node or drag to any node"}
          className={"alternis__toolBtn alternis__hoverable"}
          onClick={() => setShowSelect(prev => prev === "variable" ? undefined : "variable")}
        >
          <em><var style={{ fontSize: "20px", left: "-0.05em", bottom: "0.05em", position: "relative" }}>x</var></em>
        </button>

        {/* FIXME: need external clicks to close this */}
        {showSelect === "variable" && (
          <div style={{position: "absolute", top: "100%"}}>
            <SelectVariableWidget
              onDragVariableEnd={() => setShowSelect(undefined)}
            />
          </div>
        )}
      </>

      <>
        <button
          style={{ width: 30, height: 30, fontFamily: "serif" }}
          // FIXME: not implemented!
          title={"Select a function node to drag and drop"}
          className="alternis__toolBtn alternis__hoverable"
          onClick={() => setShowSelect(prev => prev === "function" ? undefined : "function")}
        >
          <em><var style={{ fontSize: "20px", left: "-0.1em", position: "relative" }}>f</var></em>
        </button>

        {/* TODO: better floating div implementation */}
        {showSelect === "function" && (
          <div style={{position: "absolute", top: "100%"}}>
            <SelectFunctionWidget
              getTitle={(name) => (name + `\nDrag into the editor to add a call node`)}
              onDragFunctionEnd={() => setShowSelect(undefined)}
              header="Drag a function"
            />
          </div>
        )}
      </>

      {/* FIXME: need a better breadcrumb design with the document name in the header or something */}
      <div style={{ marginLeft: "var(--gap)" }}>
        <em title="Name of the currently viewed dialogue within this project">
          {currentDialogueId}
        </em>
      </div>
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
                  content: JSON.stringify(useAppState.getState(), undefined, "  "),
                });
              }}
            >
              Dev State
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
      </div>
      <div>
        <button
          data-tut-id="export-button"
          className="alternis__toolBtn alternis__hoverable"
          onClick={async () => {
            downloadFile({
              fileName: 'doc.alternis.json',
              content: JSON.stringify(await exportToJson(), undefined, "  "),
            });
          }}
        >
          <ExportIcon width={20} height={20} className="alternis__center" />
        </button>
        <button
          data-tut-id="import-button"
          className="alternis__toolBtn alternis__hoverable"
          onClick={async () => {
            const file = await uploadFile({ type: 'text' })
            const json = JSON.parse(file.content)
            // FIXME: validate state!
            useAppState.setState(json);
          }}
        >
          <ImportIcon width={20} height={20} className="alternis__center" />
        </button>
        <NodeSearchBar />
      </div>
    </Panel>
  );
};

export const TestGraphEditor = (_props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useCurrentDialogue(s => s.nodes);
  const edges = useCurrentDialogue(s => s.edges);

  // const dragBoxSelectMouseBinding = useAppState(s => s.preferences.graph.dragBoxSelectMouseBinding);
  const appendToSelectModifier = useAppState(s => s.preferences.graph.appendToSelectModifier);
  const dragPanMouseBinding = useAppState(s => s.preferences.graph.dragPanMouseBinding);
  const addNodeMouseBinding = useAppState(s => s.preferences.graph.addNodeMouseBinding);
  const enableBoxSelectOnDrag = useAppState(s => s.preferences.graph.enableBoxSelectOnDrag);

  const connectingNodeId = React.useRef<string>();
  const graphContainerElem = React.useRef<HTMLDivElement>(null);

  useReactFlowClipboard({ graphContainerElem });

  const editorRef = React.useRef<HTMLDivElement>(null);

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
        async onSelect(e: React.MouseEvent<HTMLDivElement>) {
          const { top, left } = graphContainerElem.current!.getBoundingClientRect();
          await addNode(nodeType, {
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
            onSelectParticipant={async (_p, index) => {
              const e = contextMenuPayload;
              assert(e !== undefined);
              const { top, left } = graphContainerElem.current!.getBoundingClientRect();
              await addNode("dialogueEntry", {
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          deleteKeyCode={["Backspace", "Delete"]}
          // FIXME: need to filter illegal deletion changes here (e.g. no delete entry node)
          onNodesChange={(changes) => useCurrentDialogue.setState(s => ({
            nodes: applyNodeChanges(changes, s.nodes) as Node[],
          }), true)}
          onEdgesChange={(changes) => useCurrentDialogue.setState(s => ({
            edges: applyEdgeChanges(changes, s.edges),
          }), true)}
          onConnect={(connection) => {
            useCurrentDialogue.setState(s => ({
              edges: addEdge(connection, s.edges),
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
          // this allows us to use it for adding nodes
          zoomOnDoubleClick={false}
          onDrop={async (e) => {
            e.preventDefault();

            const dropDataText = e.dataTransfer.getData("application/alternis-project-data-item");
            if (!dropDataText) return;

            const { id, type, data } = JSON.parse(dropDataText);

            if (!(type === "participants" || (type === "variables" && (data as Variable).type === "boolean") || type === "functions"))
              return;

            const [nodeType, nodeData]
              = type === "participants"
              ? ["dialogueEntry", {
                speakerIndex: +id,
                text: "",
              }] as const
              : type === "variables"
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
            await addNode(nodeType, {
              position: graph.project({
                x: e.clientX - left - 150/2,
                y: e.clientY - top,
              }),
              initData: nodeData,
              connectingNodeId,
            });

          }}
          onEdgeClick={(_evt, edge) => {
            useCurrentDialogue.setState((s) => ({
              ...s,
              edges: s.edges.filter(e => e.id !== edge.id),
            }));
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
            <DialogueViewer />
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

