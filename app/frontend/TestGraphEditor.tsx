import React from 'react'
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
  console.log(props.data)
  const participant = useAppState((s) => s.document.participants[props.data.speakerIndex]);
  if (!participant) return "unknown participant";
  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <NodeHandle
        type="target"
        position="top"
        className={styles.handle}
        isConnectable
      />
      <div>{participant.name}</div>
      <img width="50px" height="100px" src={participant.portraitUrl} />
      <button onClick={props.data.onDelete} className={styles.deleteButton}>
        &times;
      </button>
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
        (FIXME: focus on create)
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
  //lockNode: LockNode,
  //unlockNode: UnlockNode,
  default: UnknownNode,
};

import { ContextMenu } from './components/ContextMenu'
import { Participant } from '../common/data-types/participant'

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
          onChange: (newVal: Partial<DialogueEntryProps>) =>
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

