import React, { useEffect, useLayoutEffect } from 'react'
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
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { classNames, deepCloneJson } from './react-utils'
import { Center } from "./Center";
import { AppState, getNode, makeNodeDataSetter, useAppState } from "./AppState";
import { ReactComponent as LockIcon } from "./resources/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./resources/inkscape-unlock.svg";


import { ContextMenu } from './components/ContextMenu'
import { assert } from './browser-utils'
import { useValidatedInput } from '@bentley/react-hooks'
import { InputStatus } from './hooks/useValidatedInput'

function NodeHandle(props: HandleProps & Omit<React.HTMLAttributes<HTMLDivElement>, "id">) {
  //const graph = useReactFlow();
  const radius = 20;
  return <Handle
    {...props}
    {...classNames(styles.handle, props.className)}
    style={{
      ...props.style,
      //left: props.style?.position === "relative"
        //? undefined
        //: `calc(${props.type === "source" ? 100 : 0}% - ${radius}px)`,
      // FIXME: scale with zoom?
      //width: 2 * radius,
      //height: 2 * radius,
      //borderRadius: "50%",
      //border: `${radius}px solid transparent`,
      //backgroundColor: "transparent",
    }}
  >
    {/*
    <Center>
      <div
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "50%",
          backgroundColor: "#888888",
          pointerEvents: "none",
          transform: "scale(0.5, 0.5)",
        }}
      />
    </Center>
    */}
  </Handle>;
}

// FIXME: move to common/
export interface DialogueEntry {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
  customData?: any;
}

class GraphErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { error?: Error | undefined }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo): void {
    // FIXME: log error
  }

  onErrorReload() {
    this.setState({ error: undefined })
  }

  render() {
    return (this.state.error)
      ? <div style={{ padding: 20 }}>
          <p> An error has occurred. Maybe you should reset your document? </p>
          <p> FIXME: add an option to undo here? (I think you can still hit ctrl-z right now)</p>
          <p> Try contacting <a href="#FIXME">support</a> if this continues </p>
          <button onClick={this.onErrorReload.bind(this)}>Reload the editor</button>
          <pre>
          {this.state.error.message}
          <br/>
          {this.state.error.stack}
          </pre>
        </div>
      : this.props.children
    ;
  }
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

  const [showMore, setShowMore] = React.useState(false);

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}>
      <NodeHandle
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
            text
            <textarea
              ref={textInput}
              className="nodrag"
              onChange={(e) => set({ text: e.currentTarget.value })}
              // FIXME: why not use a controlled component?
              value={data.text}
            />
          </label>
          {showMore && <>
            <label>
              title
              <input
                className="nodrag"
                onChange={(e) => set({ title: e.currentTarget.value })}
                value={data.title}
              />
            </label>
          </>}
          {/* FIXME: use an icon, this is ugly af */}
          <Center
            {...classNames(styles.entryNodeShowMoreIndicator, "hoverable")}
            onClick={() => setShowMore(prev => !prev)}
          >
            <strong style={{ transform: "scale(2, 0.8)", display: "block", width: "100%", textAlign: "center" }}>
              {showMore ? "^" : "V"}
            </strong>
          </Center>
        </>
      : <> unknown participant </>
      }
      <NodeHandle
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
    <div
      className={styles.node}
      title={
        "Lock node, changes the state of a gate.\n"
        + "Right click to change whether it locks or unlocks it"
      }
      style={{ width: "max-content" }}
      onContextMenuCapture={(e) => {
        e.stopPropagation();
        e.preventDefault();
        set(({ action }) => ({ action: action === "lock" ? "unlock" : "lock" }));
        return false;
      }}
    >
      <NodeHandle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <Center>
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
      </Center>
      <label>
        variable
        <select
          value={data.variable}
          onChange={e => set(() => ({ variable: e.currentTarget.value }))}
        >
          {Object.entries(gates)
            .map(([gateName]) => (
              <option key={gateName} value={gateName}>{gateName}</option>
            )
          )}
        </select>
      </label>
      <NodeHandle
        type="source"
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

// FIXME: rename to function call?
export interface Emit {
  function: string;
}

const EmitNode = (props: NodeProps<Emit>) => {
  const functions = useAppState(s => s.document.functions);
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Emit>(props.id)?.data;
  const set = makeNodeDataSetter<Emit>(props.id);

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}>
      <NodeHandle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <Center>
        <span style={{ fontSize: "4rem", fontWeight: "bold" }}>!</span>
      </Center>
      <label>
        emit
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
      <NodeHandle
        id={`${nodeId}_${index}`}
        type="source"
        position="right"
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

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}>
      <NodeHandle
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

interface PlayerReplies {
  replies: {
    text: string;
  }[];
}

const defaultPlayerRepliesProps = {
  replies: [{ text: "" }],
};

const PlayerRepliesNode = (props: NodeProps<PlayerReplies>) => {
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<PlayerReplies>(props.id)?.data;
  const set = makeNodeDataSetter<PlayerReplies>(props.id);

  const nodeBodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const nodeBody = nodeBodyRef.current;
    if (!nodeBody) return;
    const lastOption = nodeBody.lastChild?.previousSibling;
    if (!lastOption || !(lastOption instanceof Element)) return;

    const input = lastOption.firstElementChild;
    assert(input instanceof HTMLInputElement);
    input.focus();
  }, [data?.replies.length]);

  return !data ? null : (
    <div className={styles.node} style={{ width: "max-content" }}>
      <NodeHandle
        type="target"
        position="left"
        className={styles.handle}
        isConnectable
      />
      <div className={styles.randomSwitchBody} ref={nodeBodyRef}>
        {data.replies.map((reply, index) => (
          <div key={index} className={styles.randomSwitchInput}>
            <input
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
            <Center
              className="hoverable"
              title="Delete this option"
              onClick={() => set(s => {
                const replies = s.replies.slice();
                replies.splice(index, 1);
                return { replies };
              })}
            >
              <em>&times;</em>
            </Center>
            <NodeHandle
              id={`${props.id}_${index}`}
              type="source"
              position="right"
              className={styles.inlineHandle}
              isConnectable
            />
          </div>
        ))}
        <div
          title="Add a reply option"
          {...classNames("newButton", "hoverable")}
          onClick={() => set((s) => ({
            replies: s.replies.concat({ text: "" }),
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
      <NodeHandle
        type="source"
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  )
};

const RerouteNode = (_props: NodeProps<{}>) => {
  return (
    <div style={{ height: 5, width: 5 }}>
      <NodeHandle
        position="right"
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
  reroute: RerouteNode,
  default: UnknownNode,
};

const nodeTypeNames: Record<keyof typeof nodeTypes, string> = {
  dialogueEntry: "Line",
  randomSwitch: "Random",
  playerReplies: "Player Replies",
  lockNode: "Gate",
  emitNode: "Emit",
  entry: "Entry",
  default: "Unknown",
  reroute: "Reroute"
};

const CustomEdge = (props: EdgeProps) => {
  const [edgePath] = getBezierPath({
    ...props,
    // HACK: tweak sizes
    // FIXME: check all platforms and screen sizes
    // FIXME: not aligned on relative-positioned handles
    sourceX: props.sourceX + 5,
    sourceY: props.sourceY + 5,
    targetX: props.targetX + 5,
    targetY: props.targetY + 5,
  });
  const markerEnd = getMarkerEnd(MarkerType.Arrow, props.markerEnd);
  return <BaseEdge
    interactionWidth={20}
    path={edgePath}
    markerEnd={markerEnd}
    {...props}
    style={{strokeWidth: 2, ...props.style}}
  />;
}

const edgeTypes = {
  default: CustomEdge,
} as const

function getNewId(nodes: { id: string }[]) {
  const maxId = nodes
    .map(n => +n.id)
    .filter(n => !Number.isNaN(n))
    .reduce((prev, cur) => prev > cur ? prev : cur)
    ?? 0;
  return `${maxId + 1}`;
}

const TestGraphEditor = (_props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useAppState(s => s.document.nodes);
  const edges = useAppState(s => s.document.edges);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}, initData?: any) => {
      useAppState.setState((s) => {
        const maybeSourceNode = connectingNodeId.current;
        connectingNodeId.current = undefined;
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
                    variable: Object.keys(s.document.gates)[0],
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

  const editorRef = React.useRef<HTMLDivElement>(null);

  return (
    <GraphErrorBoundary>
      <div ref={editorRef}>
        <ContextMenu>
          <div className={styles.addNodeMenu}>
            {Object.keys(nodeTypes)
              .filter(key => key !== "entry" && key !== "default" && key !== "dialogueEntry")
              .map((nodeType) =>
                <em
                  {...classNames(styles.addNodeMenuOption, "hoverable")}
                  key={nodeType}
                  onClick={(e) => {
                    const { top, left } = graphContainerElem.current!.getBoundingClientRect();
                    addNode(nodeType, graph.project({
                      x: e.clientX - left - 150/2,
                      y: e.clientY - top,
                    }));
                  }}
                >
                  {nodeTypeNames[nodeType]}
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
            connectionMode={ConnectionMode.Loose}
            isValidConnection={(connection) => {
              // TODO: check source/target but go through reroute nodes
              return true;
            }}
            connectionRadius={25}
            multiSelectionKeyCode="Shift"
            // FIXME: not good for laptops..., maybe we need a box select icon...
            panOnDrag={[1]} // middle mouse, not great for laptops
            selectionOnDrag={true}
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
                addNode(nodeType, graph.project({
                  x: e.clientX - left - 150/2,
                  y: e.clientY - top,
                }), nodeData);
              }
            }}
            onEdgeClick={(_evt, edge) => {
              graph.deleteElements({edges: [edge]})
            }}
            onConnectStart={(_, { nodeId }) => { connectingNodeId.current = nodeId ?? undefined; }}
            onConnectEnd={(e) => {
              const targetIsPane = (e.target as Element | undefined)?.classList?.contains('react-flow__pane');
              if (targetIsPane && graphContainerElem.current && editorRef.current) {
                // FIXME: use custom event?
                const ctxMenuEvent = new MouseEvent("contextmenu", e);
                ctxMenuEvent[Symbol.for("__isConnectEnd")] = true;
                editorRef.current.dispatchEvent(ctxMenuEvent);
              }
            }}
          >
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </GraphErrorBoundary>
  );
}

namespace TestGraphEditor {
  export interface Props {
  }
}

export default TestGraphEditor

