import React, { useRef } from 'react'
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
import classNames from './classnames'
import { Center } from "./Center";
import { resetAllAppState, useAppState } from "./AppState";

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
      className={classNames(styles.handle, isInput ? styles.inputHandle : styles.outputHandle)}
    >
      {!isInput && label}
      <Handle
        id={id}
        type={props.type}
        position={props.type === "source" ? "top" : "bottom"}
        className={classNames(
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

// FIXME: move to common/
export interface DialogueEntry {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
  customData?: any;
}

export interface DialogueEntryProps extends DialogueEntry {
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<DialogueEntry>): void
  onDelete(): void
}

const DialogueEntryNode = (props: NodeProps<DialogueEntryProps>) => {
  const participant = useAppState((s) => s.document.participants[props.data.speakerIndex]);
  if (!participant) return "unknown participant";

  // focus on first mount (will be confusing on document open...)
  const textInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    textInput.current?.focus();
  }, []);

  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="top"
        className={styles.handle}
        isConnectable
      />
      <div>{participant.name}</div>
      <img width="50px" height="100px" src={participant.portraitUrl} />
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
          ref={textInput}
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
        position="bottom"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

export interface Lock {
  variable: string;
  action: "lock" | "unlock"; //| "toggle";
}

export interface LockNodeProps extends Lock {
  // FIXME: I don't think we need these anymore
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<Lock>): void
  onDelete(): void
}

import { ReactComponent as LockIcon } from "./resources/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./resources/inkscape-unlock.svg";

const LockNode = (props: NodeProps<LockNodeProps>) => {
  const gates = useAppState(s => s.document.variables.gates);
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
        position="top"
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
              <option value={gateName}>{gateName}</option>
            ))
            .concat(<option>none</option>)}
        </select>
      </label>
      <Handle
        type="source"
        position="bottom"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

const UnknownNode = (props: NodeProps<NodeState>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node}>
      <div className={styles.nodeHeader}>
        <button className={styles.deleteButton}>
          &times;
        </button>
      </div>
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </div>
  )
};

const nodeTypes = {
  //FIXME: dialogue line?
  dialogueEntry: DialogueEntryNode,
  //randomSwitch: RandomSwitchNode,
  //playerReplies: PlayerRepliesNode,
  //emitEvent: EmitEventNode,
  lockNode: LockNode,
  default: UnknownNode,
};

import { ContextMenu } from './components/ContextMenu'

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
  const graph = useReactFlow<DialogueEntryProps, {}>();
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
          onChange: (newVal: Partial<DialogueEntryProps | LockNodeProps>) =>
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

  return (
    <div className={styles.page}>
      <ContextMenu>
        <div className={styles.addNodeMenu}>
          {Object.keys(nodeTypes)
            .filter(key => key !== "default")
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
      <div className={styles.rightClickMenu} />
      <div className={styles.toolbar}>
        <button
          onClick={() => {
            downloadFile({
              fileName: 'doc.name.json',
              content: JSON.stringify({
                nodes,
                edges,
              }, null, "  "),
            })
          }}
        >
          Save
        </button>
        <button
          onClick={async () => {
            const file = await uploadFile({ type: 'text' })
            const json = JSON.parse(file.content)
            graph.setNodes(Object.values(json.nodes));
            graph.setEdges(json.edges);
          }}
        >
          Load
        </button>
        <button
          onClick={async () => {
            resetAllAppState();
          }}
        >
          Reset
        </button>
      </div>
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

