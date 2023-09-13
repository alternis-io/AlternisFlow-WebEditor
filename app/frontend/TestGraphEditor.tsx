import React, { useRef } from 'react'
import ReactFlow, {
  addEdge,
  Handle,
  NodeProps,
  Node,
  Controls,
  MiniMap,
  EdgeProps,
  getMarkerEnd,
  getBezierPath,
  Edge,
  useReactFlow,
  MarkerType,
  BaseEdge,
  useEdges,
  useNodes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import styles from './TestGraphEditor.module.css'
import { downloadFile, uploadFile } from './localFileManip'
import classNames from './classnames'
import { useValidatedInput, useStable, useOnMount } from "@bentley/react-hooks"
import { InputStatus } from '@bentley/react-hooks/lib/useValidatedInput'
import { Center } from "./Center";
import { DialogueEntry, DialogueEntryNodeData, useAppState } from "./AppState";
import { assert } from "./browser-utils";

// FIXME: consolidate with AppState.ts
interface NodeData {
  comment?: string;
}

interface NodeState extends NodeData {
  /** shallow merges in a patch to the data for that entry */
  onChange(newData: Partial<NodeData>): void
}

const NodeHandle = (props: {
  direction: "input" | "output";
  label: string;
  owningNodeId: string;
  index: number;
} & NodeData) => {
  const isInput = props.direction === "input"
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
        type={isInput ? "source" : "target"}
        position={isInput ? "left" : "right"}
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

const DialogueEntryNode = (props: NodeProps<DialogueEntryNodeData>) => {
  //const appCtx = React.useContext(AppCtx)
  return (
    <div className={styles.node} style={{ width: "max-content" }}>
      <Handle
        type="target"
        position="top"
        className={styles.handle}
        isConnectable
      />
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
        {props.data.portrait && (
          <img
            className={styles.portraitImg}
            src={appCtx.portraits.get(props.data.portrait)}
            alt={props.data.portrait}
          />
        )}
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
          className="nodrag"
          onChange={e =>
            props.data.onChange({ ...props.data, text: e.currentTarget.value })
          }
          defaultValue={props.data.text}
        />
      </label>
      <button onClick={props.data.onDelete} className={styles.deleteButton}>
        &times;
      </button>
      {/* will dynamically add handles potentially... */}
      <Handle
        type="source"
        position="bottom"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
}

const UnknownNode = (props: NodeProps<NodeState>) => {
  // TODO: store connections on data in case the correct type is restored
  return (
    <div className={styles.node} style={{ height: 50, width: 100 }}>
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
  dialogueEntry: DialogueEntryNode,
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
  const graph = useReactFlow<{}, {}>();
  const edges = useEdges<{}>();
  const nodes = useNodes<NodeData>();

  const [doc, setAppState] = useAppState((s) => s.document);

  React.useEffect(() => {
    setAppState(s => {
      s.document.nodes = nodes;
      s.document.edges = edges;
    });
  }, [nodes, edges]);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}) => {
      const newId = `${Math.round(Math.random() * Number.MAX_SAFE_INTEGER)}`
      graph.addNodes({
          id: newId,
          type: nodeType,
          data: {
            onChange: (newVal: Partial<NodeState>) =>
              graph.setNodes(prev => {
                const copy = prev.slice()
                const index = copy.findIndex(elem => elem.id === newId)
                const elem = copy[index]
                copy[index] = {
                  ...elem,
                  data: {
                    ...elem.data,
                    ...newVal,
                  },
                }
                return copy
              }),
          },
          position,
        }
      )
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
            interface SerializedNode extends Node {
              inputs: string[];
              outputs: string[];
            }

            const nodes = new Map<string, SerializedNode>();

            function fromFlowNode(node: Node): SerializedNode {
              const nodeData = node.data as NodeData;
              // TODO: unscrew types
              if (!("isEntry" in nodeData))
                (nodeData as NodeData).isEntry = node.type === "CustomTickEntry";

              const result = {
                ...node,
                inputs: new Array(nodeData.fullDesc.inputs.length ?? 0),
                outputs: new Array(nodeData.fullDesc.outputs.length ?? 0),
              };

              for (const [key, value] of Object.entries(nodeData.literalInputs)) {
                const index = +key;
                result.inputs[key] = value;
              }

              return result;
            }

            for (let i = 0; i < edges.length; ++i) {
              const edge = edges[i];
              assert(edge.sourceHandle && edge.targetHandle);
              // flow's graph directionality is arbitrary to us
              // establish direction based on whether handle is input or output
              const [handle1NodeId, handle1IsInput, handle1Index] = edge.sourceHandle.split("_");
              const [handle2NodeId, handle2IsInput, handle2Index] = edge.targetHandle.split("_");
              assert(handle1NodeId && handle1IsInput && handle1Index);
              assert(handle2NodeId && handle2IsInput && handle2Index);
              const handle1 = { nodeId: handle1NodeId, handleIndex: +handle1Index, handleId: edge.sourceHandle };
              const handle2 = { nodeId: handle2NodeId, handleIndex: +handle2Index, handleId: edge.targetHandle };
              const toZigHandle = ({ nodeId, handleIndex }: typeof handle1) => ({ nodeId, handleIndex });
              const { source, target } = handle1IsInput
                ? { source: handle2, target: handle1 }
                : { source: handle1, target: handle2 };
              const sourceNode = graph.getNode(source.nodeId);
              const targetNode = graph.getNode(target.nodeId);
              assert(sourceNode && targetNode);

              let sourceResultNode = nodes.get(source.nodeId);
              if (sourceResultNode === undefined) {
                sourceResultNode = fromFlowNode(sourceNode);
                nodes.set(source.nodeId, sourceResultNode);
              }
              sourceResultNode.outputs[source.handleIndex] = toZigHandle(target);

              let targetResultNode = nodes.get(target.nodeId);
              if (targetResultNode === undefined) {
                targetResultNode = fromFlowNode(targetNode);
                nodes.set(target.nodeId, targetResultNode);
              }
              targetResultNode.inputs[target.handleIndex] = toZigHandle(source);
            }

            downloadFile({
              fileName: 'graph.json',
              content: JSON.stringify({
                nodes: Object.fromEntries(nodes.entries()),
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
            graph.setNodes([]);
            graph.setEdges([]);
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

