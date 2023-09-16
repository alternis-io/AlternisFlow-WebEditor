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
  const { data } = getNode<DialogueEntry>(props.id);
  const participant = useAppState((s) => s.document.participants[data.speakerIndex]);
  if (!participant) return "unknown participant";
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
  const { data } = getNode<Lock>(props.id);
  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data.action === "lock" ? LockIcon : UnlockIcon;

  return (
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
          onChange={e => set(l => ({ variable: e.currentTarget.value }))}
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
  // FIXME: why can't we use props.data?
  const { data } = getNode<RandomSwitch>(props.id);
  const totalProportion = data.proportions.reduce((prev, curr) => prev + curr, 0);
  const set = makeNodeDataSetter<RandomSwitch>(props.id);

  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <div className={styles.randomSwitchBody}>
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
            <Handle
              id={`${props.id}_${index}`}
              style={{
                top: `${(index + 0.5) / data.proportions.length * 100}%`
              }}
              type="source"
              position="right"
              className={styles.handle}
              isConnectable
            />
          </div>
        ))}
      </div>
    </div>
  )
};

const UnknownNode = (props: NodeProps<{}>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node}>
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </div>
  )
};

const EntryNode = (props: NodeProps<{}>) => {
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

  const doc = useAppState((s) => s.document);
  const set = useAppState((s) => s.set);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}, initData?: any) => {
      const newId = `${Math.round(Math.random() * Number.MAX_SAFE_INTEGER)}`
      graph.addNodes({
        id: newId,
        type: nodeType,
        data: {
          ...nodeType === "lockNode" && {
            action: "lock",
          },
          ...nodeType === "randomSwitch" && deepCloneJson(defaultRandomSwitchProps),
          ...initData,
        },
        position,
      });
    },
    []
  );

  const connectingNodeId = React.useRef<string>();
  const graphContainerElem = React.useRef<HTMLDivElement>(null);

  // FIXME: mitigate a seeming firefox bug
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
              <em className={styles.addNodeMenuOption} key={nodeType} onClick={(e) => {
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
          defaultNodes={nodes}
          defaultEdges={edges}
          deleteKeyCode={"Delete"} /*DELETE key*/
          snapToGrid
          snapGrid={[15, 15]}
          nodeTypes={nodeTypes}
          //edgeTypes={edgeTypes}
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
          onEdgesDelete={(edges) => {
            for (const edge of edges) {
              graph.setNodes(nodes => nodes.map(n => {
                if (n === edge.sourceNode)
                  n.data = {...n.data}; // force update
                return n;
              }));
            }
          }}
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

