import React, { useLayoutEffect } from 'react'
import ReactFlow, {
  Handle,
  Node,
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
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { classNames, deepCloneJson } from './react-utils'
import { Center } from "./Center";
import { getNode, makeNodeDataSetter, useAppState } from "./AppState";
import { ReactComponent as LockIcon } from "./resources/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./resources/inkscape-unlock.svg";


import { ContextMenu } from './components/ContextMenu'

// FIXME: move to common/
export interface DialogueEntry {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
  customData?: any;
}

const DialogueEntryNode = (props: NodeProps<DialogueEntry>) => {
  const node = getNode<DialogueEntry>(props.id);

  const data = node?.data;
  const participant = useAppState((s) => data?.speakerIndex && s.document.participants[data.speakerIndex]);
  const set = makeNodeDataSetter<DialogueEntry>(props.id);

  // focus on first mount (FIXME: how does this react to document opening?)
  const textInput = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    textInput.current?.focus();
  }, []);

  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="left"
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
            title
            <input
              className="nodrag"
              onChange={(e) => set({ title: e.currentTarget.value })}
              value={data.title}
            />
          </label>
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
      <Handle
        type="source"
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

export interface Lock {
  variable: string;
  action: "lock" | "unlock";
}

const LockNode = (props: NodeProps<Lock>) => {
  const gates = useAppState(s => s.document.gates);
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Lock>(props.id)?.data;
  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data?.action === "lock" ? LockIcon : UnlockIcon;

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        set(({ action }) => ({ action: action === "lock" ? "unlock" : "lock" }));
      }}
    >
      <Handle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <Icon
        style={{
          height: 150,
          width: 150,
          // TODO: style all of this SVG's elements... also fix the SVG itself
          stroke: "#000",
          strokeLinecap: "round",
        }}
        viewBox="-2 -2 85 112"
      />
      <label>
        variable
        <select
          onChange={e => set(() => ({ variable: e.currentTarget.value }))}
        >
          {Object.entries(gates)
            .map(([gateName]) => (
              <option key={gateName} value={gateName}>{gateName}</option>
            )
          )}
        </select>
      </label>
      <Handle
        type="source"
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

interface RandomSwitch {
  proportions: number[];
}

const defaultRandomSwitchProps = {
  proportions: [1, 1],
};

const percentFmter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, style: "percent" });

const RandomSwitchNode = (props: NodeProps<RandomSwitch>) => {
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<RandomSwitch>(props.id)?.data;
  const totalProportion = data?.proportions.reduce((prev, curr) => prev + curr, 0) ?? 1;
  const set = makeNodeDataSetter<RandomSwitch>(props.id);

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <div className={styles.randomSwitchBody}>
        <Center>
          <strong style={{fontSize: "2rem"}}>?</strong>
        </Center>
        {data.proportions.map((proportion, index) => (
          <div className={styles.randomSwitchInput}>
            <input
              value={String(proportion)}
              onChange={(e) => {
                // FIXME: just useValidatedInput
                const next = parseInt(e.currentTarget.value);
                if (Number.isNaN(next))
                  return;

                set(({ proportions }) => {
                  const updatedList = proportions.slice();
                  updatedList[index] = next;
                  return {
                    proportions: updatedList
                  };
                })
              }}
            />
            <span>
              ({percentFmter.format(proportion / totalProportion)})
            </span>
            <Center
                className="hoverable"
                title="Delete this possibility"
                onClick={() => set(s => {
                  const proportions = s.proportions.slice();
                  proportions.splice(index, 1); // remove
                  return { proportions };
                })}
              >
                <em>&times;</em>
              </Center>
            <Handle
              id={`${props.id}_${index}`}
              style={{
                position: "relative",
              }}
              type="source"
              position="right"
              className={styles.handle}
              isConnectable
            />
          </div>
        ))}
        <div
          title="Add a possibility"
          {...classNames("newButton", "hoverable")}
          onClick={() => set((s) => ({
            proportions: s.proportions.concat(1),
          }))}
        >
          <Center>+</Center>
        </div>
      </div>
    </div>
  )
};

const UnknownNode = (_props: NodeProps<{}>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node}>
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </div>
  )
};

const EntryNode = (_props: NodeProps<{}>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node}>
      <Center style={{ padding: 5 }}>
        <strong>Start</strong>
      </Center>
      <Handle
        type="source"
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

const nodeTypes = {
  //FIXME: dialogue line?
  dialogueEntry: DialogueEntryNode,
  randomSwitch: RandomSwitchNode,
  //playerReplies: PlayerRepliesNode,
  //emitEvent: EmitEventNode,
  lockNode: LockNode,
  entry: EntryNode,
  default: UnknownNode,
};

const CustomEdge = (props: EdgeProps) => {
  // TODO: draw path from boundary of handle box
  const [edgePath] = getBezierPath({ ...props })
  const markerEnd = getMarkerEnd(MarkerType.Arrow, props.markerEnd)
  return <BaseEdge path={edgePath} markerEnd={markerEnd} {...props} />
}

const edgeTypes = {
  default: CustomEdge,
} as const

const TestGraphEditor = (props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useAppState(s => s.document.nodes);
  const edges = useAppState(s => s.document.edges);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}, initData?: any) => {
      const newId = `${Math.round(Math.random() * Number.MAX_SAFE_INTEGER)}`
      useAppState.setState((s) => ({
        document: {
          ...s.document,
          nodes: s.document.nodes.concat({
            id: newId,
            type: nodeType,
            data: {
              ...nodeType === "lockNode"
                ? { action: "lock" }
                : nodeType === "randomSwitch"
                ? deepCloneJson(defaultRandomSwitchProps)
                : {},
              ...initData,
            },
            position,
          }),
        },
      }));
    },
    []
  );

  const connectingNodeId = React.useRef<string>();
  const graphContainerElem = React.useRef<HTMLDivElement>(null);

  // FIXME: mitigate an apparent firefox bug
  useLayoutEffect(() => {
    const reactFlowRenderer = document.querySelector(".react-flow") as HTMLDivElement | null;
    if (reactFlowRenderer === null) return;
    reactFlowRenderer.style.position = "initial";
    setTimeout(() => (reactFlowRenderer.style.position = "relative"));
  }, []);

  return (
    <div className={styles.page}>
      <ContextMenu>
        <div className={styles.addNodeMenu}>
          {Object.keys(nodeTypes)
            .filter(key => key !== "entry" && key !== "default")
            .map((nodeType) =>
              <em {...classNames(styles.addNodeMenuOption, "hoverable")} key={nodeType} onClick={(e) => {
                const { top, left } = graphContainerElem.current!.getBoundingClientRect();
                addNode(nodeType, graph.project({
                  x: e.clientX - left - 150/2,
                  y: e.clientY - top,
                }))}
              }>
                {nodeType}
              </em>
            )
          }
        </div>
      </ContextMenu>
      <div className={styles.graph} ref={graphContainerElem}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          deleteKeyCode={"Delete"} /*DELETE key*/
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
          onConnect={(connection) => useAppState.setState(s => ({
            document: {
              ...s.document,
              edges: addEdge(connection, s.document.edges),
            },
          }))}
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
          onDrop={(e) => {
            e.preventDefault();
            const participantDataText = e.dataTransfer.getData("application/dialogical-participant");
            if (participantDataText) {
              const { index } = JSON.parse(participantDataText);
              const { top, left } = graphContainerElem.current!.getBoundingClientRect();
              // FIXME: no hardcoded node width
              const props: DialogueEntry = {
                speakerIndex: index,
                text: "this is default text"
              };
              addNode("dialogueEntry", graph.project({
                x: e.clientX - left - 150/2,
                y: e.clientY - top,
              }), props);
            }
          }}
          onEdgeClick={(_evt, edge) => {
            graph.deleteElements({edges: [edge]})
          }}
          onConnectStart={(_, { nodeId }) => connectingNodeId.current = nodeId ?? undefined}
          // TODO: context menu on edge drop
          onConnectEnd={() => connectingNodeId.current = undefined}
        >
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}

namespace TestGraphEditor {
  export interface Props {
  }
}

export default TestGraphEditor

