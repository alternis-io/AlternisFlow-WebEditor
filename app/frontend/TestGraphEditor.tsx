import React, { useLayoutEffect, useRef } from 'react'
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
  useEdges,
  useNodes,
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { downloadFile, uploadFile } from './localFileManip'
import { classNames, deepCloneJson } from './react-utils'
import { Center } from "./Center";
import { resetAllAppState, useAppState } from "./AppState";

import { ContextMenu } from './components/ContextMenu'

// FIXME: consolidate with AppState.ts
interface NodeData {
  comment?: string;
}

interface NodeState extends NodeData {
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<NodeData>): void
}

const NodeHandle = (props: {
  type: "source" | "target";
  label: string;
  owningNodeId: string;
  index: number;
}) => {
  const isInput = props.type === "source";
  const id = `${props.owningNodeId}_${isInput}_${props.index}`;
  /*
  const edges = useEdges();
  const isConnected = React.useMemo(() =>
    edges.find(e => e.sourceHandle === id || e.targetHandle === id),
    [edges]
  );
  */

  const label = <label>{props.label}</label>;

  return (
    <div 
      {...classNames(styles.handle, isInput ? styles.inputHandle : styles.outputHandle)}
    >
      {!isInput && label}
      <Handle
        id={id}
        type={props.type}
        position={props.type === "source" ? "left" : "right"}
        {...classNames(
          styles.knob,
          isInput
            ? styles.inputHandle
            : styles.outputHandle,
        )}
        style={{
          backgroundColor: "#ff000",
        }}
      />
    </div>
  );
};

interface NodeBaseData<T> {
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<T>): void
  onDelete(): void
}

// FIXME: move to common/
export interface DialogueEntry {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
  customData?: any;
}

export type DialogueEntryProps = DialogueEntry & NodeBaseData<DialogueEntry>;

const DialogueEntryNode = (props: NodeProps<DialogueEntryProps>) => {
  const participant = useAppState((s) => s.document.participants[props.data.speakerIndex]);
  if (!participant) return "unknown participant";

  // focus on first mount (will be confusing on document open...)
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
      {/*
      <label>
        portrait
        <select
          onChange={e =>
            props.data.onChange({ portrait: e.currentTarget.value })
          }
        >
          {[...appCtx.portraits]
            .map(([imageName]) => (
              <option value={imageName}>{imageName}</option>
            ))
            .concat(<option>none</option>)}
        </select>
      </label>
      */}
      <label>
        title
        <input
          className="nodrag"
          onChange={e =>
            props.data.onChange({ ...props.data, title: e.currentTarget.value })
          }
          defaultValue={props.data.title}
        />
      </label>
      <label>
        text
        <textarea
          ref={textInput}
          className="nodrag"
          onChange={e =>
            props.data.onChange({ ...props.data, text: e.currentTarget.value })
          }
          defaultValue={props.data.text}
        />
      </label>
      {/* will dynamically add handles potentially... */}
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

export type LockProps = Lock & NodeBaseData<Lock>;

import { ReactComponent as LockIcon } from "./resources/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./resources/inkscape-unlock.svg";

const LockNode = (props: NodeProps<LockProps>) => {
  const gates = useAppState(s => s.document.gates);
  const set = useAppState((s) => s.set);
  const action = props.data.action
  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = action === "lock" ? LockIcon : UnlockIcon;
  return (
    <div className={styles.node} style={{ width: "max-content" }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        const next = action === "lock" ? "unlock" : "lock";
        props.data.onChange({ action: next });
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
          onChange={e =>
            set((s) => {
              const nodes = s.document.nodes.slice();
              const thisNodeIndex = nodes.findIndex(n => n.type === "lockNode");
              const thisNode = nodes[thisNodeIndex];
              nodes[thisNodeIndex] = {
                ...thisNode,
              };
              return {
                document: {
                  ...s.document,
                  nodes,
                },
              };
            })
          }
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

export type RandomSwitchProps = RandomSwitch & NodeBaseData<RandomSwitch>;

const RandomSwitchNode = (props: NodeProps<RandomSwitchProps>) => {
  const totalProportion = props.data.proportions.reduce((prev, curr) => prev + curr, 0);

  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <div className={styles.randomSwitchBody}>
        {props.data.proportions.map((proportion, index) => (
          <div className={styles.randomSwitchInput}>
            <input
              value={String(proportion)}
              onChange={(e) => {
                // FIXME: just useValidatedInput
                const next = parseInt(e.currentTarget.value);
                if (Number.isNaN(next))
                  return;
                const updatedList = props.data.proportions.slice();
                updatedList[index] = next;
                props.data.onChange({
                  proportions: updatedList
                });
              }}
            />
            <Handle
              id={`${props.id}_${index}`}
              style={{
                top: `${(index + 0.5) / props.data.proportions.length * 100}%`
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

const UnknownNode = (props: NodeProps<NodeState>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node}>
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </div>
  )
};

const EntryNode = (props: NodeProps<NodeBaseData<{}>>) => {
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
  const graph = useReactFlow<DialogueEntryProps | LockProps | RandomSwitchProps, {}>();
  // FIXME: document should proxy this state, not own it...
  const edges = useEdges<{}>();
  const nodes = useNodes<DialogueEntryProps>();

  const doc = useAppState((s) => s.document);
  const set = useAppState((s) => s.set);

  React.useEffect(() => {
    set((s) => ({
      document: {
        ...s.document,
        nodes,
        edges,
      },
    }));
  }, [nodes, edges]);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}, initData?: any) => {
      const newId = `${Math.round(Math.random() * Number.MAX_SAFE_INTEGER)}`
      graph.addNodes({
        id: newId,
        type: nodeType,
        data: {
          ...initData,
          ...nodeType === "lockNode" && {
            action: "lock",
          },
          ...nodeType === "randomSwitch" && deepCloneJson(defaultRandomSwitchProps),
          onChange: (newVal: Partial<DialogueEntryProps | LockProps>) =>
            graph.setNodes(prev => {
              const copy = prev.slice();
              const index = copy.findIndex(elem => elem.id === newId);
              const elem = copy[index];
              copy[index] = {
                ...elem,
                data: {
                  ...elem.data,
                  ...newVal,
                },
              };
              return copy;
            }),
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
          defaultNodes={doc.nodes}
          defaultEdges={doc.edges}
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

