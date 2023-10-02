import React, { useEffect, useLayoutEffect, useState } from 'react'
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
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { Link } from "react-router-dom";
import { baseUrl } from "./hooks/useApi";
import { classNames, deepCloneJson } from 'js-utils/lib/react-utils'
import { Center } from "./Center";
import { getNode, makeNodeDataSetter, useAppState } from "./AppState";
import { ReactComponent as LockIcon } from "./images/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./images/inkscape-unlock.svg";
import { ContextMenuOptions } from './components/ContextMenu'
import { assert } from 'js-utils/lib/browser-utils'
import { useValidatedInput } from '@bentley/react-hooks'
import { InputStatus } from './hooks/useValidatedInput'
import { useReactFlowClipboard } from './hooks/useReactFlowClipboard'

import { GotoNode } from './nodes';
import { NodeHandle } from './nodes/handle';
import { BaseNode } from './nodes/BaseNode';
import { DialogueEntry, Emit, Lock, RandomSwitch, PlayerReplies, PlayerReply, defaultRandomSwitchProps, defaultPlayerRepliesProps } from './nodes/data';

// FIXME: rename
const DialogueEntryNode = (props: NodeProps<DialogueEntry>) => {
  const node = getNode<DialogueEntry>(props.id);

  const data = node?.data;
  const participant = useAppState((s) =>
    data?.speakerIndex !== undefined
    ? s.document.participants[data.speakerIndex]
    : undefined
  );
  const set = makeNodeDataSetter<DialogueEntry>(props.id);

  // focus on first mount (FIXME: how does this react to document opening?)
  const textInput = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    textInput.current?.focus();
  }, []);

  return !data ? null : (
    <BaseNode
      id={props.id}
      showMoreContent={<>
        <label>
          title
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
            <div>{participant.name}</div>
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
  const bools = Object.entries(variables).filter(([, v]) => v.type === "boolean");
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Lock>(props.id)?.data;
  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data?.action === "lock" ? LockIcon : UnlockIcon;

  const iconRef = React.useRef<HTMLDivElement>(null);

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

  return !data ? null : (
    <BaseNode
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
        event
        <select
          value={data.function}
          onChange={e => set(() => ({ function: e.currentTarget.value }))}
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
      <Center
          className="hoverable hoverable-red"
          title="Delete this possibility"
          onClick={() => set(s => {
            const proportions = s.proportions.slice();
            proportions.splice(index, 1); // remove
            return { proportions };
          })}
        >
          <em>&times;</em>
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

  return !data ? null : (
    <BaseNode
      id={props.id}
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
      <div className={styles.randomSwitchBody}>
        <Center>
          <strong style={{fontSize: "2rem"}}>?</strong>
        </Center>
        {data.proportions.map((proportion, index) => (
          <RandomSwitchInput
            nodeId={props.id}
            proportion={proportion}
            totalProportion={totalProportion}
            index={index}
          />
        ))}
        <div
          title="Add a possibility"
          {...classNames("newButton", "hoverable")}
          onClick={() => {
            set((s) => ({
              proportions: s.proportions.concat(1),
            }));
            updateNodeInternals(props.id);
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
  const bools = Object.entries(variables).filter(([, v]) => v.type === "boolean");
  const Icon
    = props.reply.lockAction === "none"
    ? AddLockIcon
    : props.reply.lockAction === "unlock"
    ? UnlockIcon
    : LockIcon;

  return (
    <>
      <Center
        key={`${props.keyPrefix ?? ""}-lockicon`}
        className="hoverable"
        {...props.reply.lockAction === "none"
          ? {
            title: bools.length > 0
              ? "Click to lock this reply on a locked boolean variable"
              : "Add a boolean variable to be able to lock on one",
            onClick: () => {
              // FIXME: error toast on no available bool variables? Or just hide this entirely?
              // or even offer to create a new variable then and there...
              if (bools.length <= 0) return;
              const [firstBoolVarName] = bools[0];
              props.set({
                lockVariable: firstBoolVarName,
                lockAction: "lock",
              });
            },
          } : props.reply.lockAction === "lock" ? {
            title: "Click to lock this reply on an unlocked boolean variable",
            onClick: () => {
              props.set({
                lockAction: "unlock",
              });
            },
          } : /* props.reply.lockAction === "unlock" */ {
            title: "Click to remove locks from this reply",
            onClick: () => {
              props.set({
                lockVariable: undefined,
                lockAction: "none",
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
          // can't use "display: none" or the grid is broken
          ...props.reply.lockAction === "none"
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

  const nodeBodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // FIXME: reenable
    const nodeBody = nodeBodyRef.current;
    if (!nodeBody) return;

    const firstInput = nodeBody.querySelector("input");
    if (!firstInput) return;
    firstInput.focus();
  }, [data?.replies.length]);

  return !data ? null : (
    <BaseNode
      id={props.id}
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
      <p>Player</p>
      <div className={styles.playerRepliesBody} ref={nodeBodyRef}>
        {data.replies.map((reply, index) => (
          <>
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
                  ...prevReplies[index],
                  ...typeof s === "function" ? s(prevReplies[index]) : s,
                };
                return { replies: nextReplies };
              })}
              index={index}
            />
            <Center
              key={`delete-${index}`}
              className="hoverable hoverable-red"
              title="Delete this option"
              onClick={() => set(s => {
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
              <em>&times;</em>
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
          </>
        ))}
        <div
          title="Add a reply option"
          {...classNames("newButton", "hoverable")}
          onClick={() => {
            set((s) => ({
              replies: s.replies.concat({ text: "", lockAction: "none", lockVariable: undefined }),
            }));
            updateNodeInternals(props.id);
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

const RerouteNode = (props: NodeProps<{}>) => {
  return (
    <BaseNode
      id={props.id}
      title="The 'Reroute' node helps you organize curvier dialogues with cycles"
      // FIXME: not very usable
      style={{ height: 5, width: 5 }}
      noLabel
    >
      <NodeHandle
        id={props.id}
        index={0}
        style={{
          top: 15,
          left: 1,
        }}
        position={Position.Right}
        className={styles.handle}
        isConnectable
      />
    </BaseNode>
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
  reroute: RerouteNode,
  goto: GotoNode,
  default: UnknownNode,
};

const nodeTypeNames: Record<keyof typeof nodeTypes, string> = {
  dialogueEntry: "Line",
  randomSwitch: "Random",
  playerReplies: "Player Replies",
  lockNode: "Lock",
  emitNode: "Emit",
  entry: "Entry",
  reroute: "Reroute",
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

  if (sourceNode?.type === "reroute" || targetNode?.type === "reroute") {
    return <RerouteEdge {...props} />;
  }

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

// FIXME: completely broken, just need to detect if the node
function RerouteEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, id, markerEnd } = props;
  const xDir = targetX < sourceX ? -1 : 1;
  const edgePath = `M ${sourceX - 5} ${sourceY} C ${sourceX + xDir * 100} ${sourceY} ${targetX - xDir * 100} ${targetY} ${targetX} ${targetY}`;

  return <BaseEdge {...props} path={edgePath} markerEnd={markerEnd} />;
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
  nodeType: string, {
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

export const TestGraphEditor = (_props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useAppState(s => s.document.nodes);
  const edges = useAppState(s => s.document.edges);
  const permsVersion = useAppState(s => s.permissions.version);

  const [trialMessageShown, setTrialMessageShown] = useState(false);
  useEffect(() => {
    if (permsVersion === "trial" && nodes.length > 50)
      setTrialMessageShown(true);
  }, [nodes, permsVersion]);

  const dragBoxSelectMouseBinding = useAppState(s => s.preferences.graph.dragBoxSelectMouseBinding);
  const appendToSelectModifier = useAppState(s => s.preferences.graph.appendToSelectModifier);
  const dragPanMouseBinding = useAppState(s => s.preferences.graph.dragPanMouseBinding);
  const addNodeMouseBinding = useAppState(s => s.preferences.graph.addNodeMouseBinding);
  const enableBoxSelectOnDrag = useAppState(s => s.preferences.graph.enableBoxSelectOnDrag);

  const connectingNodeId = React.useRef<string>();
  const graphContainerElem = React.useRef<HTMLDivElement>(null);

  useReactFlowClipboard({ graphContainerElem });

  // FIXME: mitigate an apparent firefox bug
  useLayoutEffect(() => {
    const reactFlowRenderer = document.querySelector(".react-flow") as HTMLDivElement | null;
    if (reactFlowRenderer === null) return;
    reactFlowRenderer.style.position = "initial";
    setTimeout(() => (reactFlowRenderer.style.position = "relative"));
  }, []);

  const editorRef = React.useRef<HTMLDivElement>(null);

  const forceAddNodeEvent = "force-addnode";

  return (
    <div ref={editorRef}>
      <ContextMenuOptions
        forceEventKey={forceAddNodeEvent}
        mouseBinding={addNodeMouseBinding}
        className={styles.addNodeMenu}
        onHide={() => {
          connectingNodeId.current = undefined;
        }}
        options={Object.keys(nodeTypes)
          .filter(key => key !== "entry" && key !== "default" && key !== "dialogueEntry")
          .map((nodeType) => ({
              id: nodeType,
              label: nodeTypeNames[nodeType],
              onSelect(e) {
                const { top, left } = graphContainerElem.current!.getBoundingClientRect();
                addNode(nodeType, {
                  position: graph.project({
                    x: e.clientX - left - 150/2,
                    y: e.clientY - top,
                  }),
                  connectingNodeId,
                });
              },
            })
          )
        }
      />
      <div className={styles.graph} ref={graphContainerElem}>
        <dialog open={trialMessageShown}>
          <p>Thank you for trying <Link to={baseUrl}>Alternis</Link>!</p>
          <p>
            Please <Link to={"FIXME"}>sign up</Link> (only $10 a month) to
            use the full version!
          </p>
          <p> TODO a pretty advertisement with live cost data </p>
        </dialog>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          deleteKeyCode={["Backspace", "Delete", "x"]}
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
            if (source?.type === "reroute" || target?.type === "reroute")
              // FIXME: go through reroute nodes
              return true;
            const sourceType = connection.sourceHandle?.includes("source") ? "source" : "target";
            const targetType = connection.targetHandle?.includes("source") ? "source" : "target";
            if (!source || !target || !sourceType || !targetType) return true;
            return sourceType !== targetType;
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
                  } as DialogueEntry]
                // : type === "variables"
                // ? ["dialogueEntry", {
                //     speakerIndex: +id,
                //     text: "",
                //   } as DialogueEntry]
                : type === "gates"
                ? ["lockNode", {
                    variable: id,
                    action: "unlock",
                  } as Lock]
                : type === "functions"
                ? ["emitNode", {
                    function: id,
                  } as Emit]
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
            maskColor="#363636aa" // FIXME: reference var(--bg-1-hover)
            style={{
              backgroundColor: "var(--bg-1)",
            }}
          />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

namespace TestGraphEditor {
  export interface Props {
  }
}

export default TestGraphEditor

