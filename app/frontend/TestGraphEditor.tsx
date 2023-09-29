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
  Background,
  BezierEdge,
  useNodes,
} from 'reactflow'
import 'reactflow/dist/base.css'
import styles from './TestGraphEditor.module.css'
import { classNames, deepCloneJson } from 'js-utils/lib/react-utils'
import { Center } from "./Center";
import { AppState, MouseInteractions, getNode, makeNodeDataSetter, useAppState } from "./AppState";
import { ReactComponent as LockIcon } from "./images/inkscape-lock.svg";
import { ReactComponent as UnlockIcon } from "./images/inkscape-unlock.svg";


import { ContextMenuOptions } from './components/ContextMenu'
import { assert } from 'js-utils/lib/browser-utils'
import { useValidatedInput } from '@bentley/react-hooks'
import { InputStatus } from './hooks/useValidatedInput'

function NodeHandle(props: HandleProps & Omit<React.HTMLAttributes<HTMLDivElement>, "id">) {
  //const graph = useReactFlow();
  const radius = 12;
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
          <p> Try contacting <a href="support@alternis.io">support</a> if this continues </p>
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

// FIXME: rename
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
    <div
      className={styles.node}
      style={{ width: "max-content" }}
      title={
        "The 'Dialogue Entry' node, has a participant say a particular line.\n"
        + "The line may be locked by a true/false variable."
      }
    >
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
              <svg
                viewBox="-5 -5 15 15"
                height="15px" width="30px"
                strokeWidth={"2px"}
                strokeLinecap="round"
                style={{
                  transform: showMore ? "scale(1, -1)" : undefined, stroke: "white", fill: "none"
                }}
                className={"hoverable"}
              >
                <path d="M0 0 l5 5 l5 -5" />
              </svg>
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
  const variables = useAppState(s => s.document.variables);
  const bools = Object.entries(variables).filter(([, v]) => v.type === "boolean");
  // REPORTME: react-flow seems to sometimes render non-existing nodes briefly?
  const data = getNode<Lock>(props.id)?.data;
  const set = makeNodeDataSetter<Lock>(props.id);

  // FIXME: this might be low-performance? not sure it matters tbh
  const Icon = data?.action === "lock" ? LockIcon : UnlockIcon;

  return !data ? null : (
    <div
      className={styles.node}
      title={
        "The 'Lock' node, changes the state of a gate.\n"
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
          value={data.variable}
          onChange={e => set(() => ({ variable: e.currentTarget.value }))}
        >
          {bools.map(([boolName]) => (
              <option key={boolName} value={boolName}>{boolName}</option>
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
    <div
      className={styles.node}
      style={{ width: "max-content" }}
      title={
        "The 'Function Call' node, triggers environment-registered handlers to run custom logic"
      }
    >
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
    <div
      className={styles.node}
      style={{ width: "max-content" }}
      title={
        "The 'Random Switch' node picks a random output.\n"
        + "Each output has a number of chances compared out of the total to be reached. "
        + "You can see the exact chance in each option's calculated percentage."
      }
    >
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

interface PlayerReply {
  text: string;
  lockVariable: string | undefined;
  // FIXME: replace with "lock negation"... this is not an action, it's whether the gate must
  // be "locked" or "unlocked" for this reply to be locked or unlocked
  lockAction: "none" | "lock" | "unlock";
}

interface PlayerReplies {
  replies: PlayerReply[];
}

const defaultPlayerRepliesProps: PlayerReplies = {
  replies: [
    {
      text: "",
      // FIXME: note, people may want compound boolean checks...
      lockVariable: undefined,
      lockAction: "none",
    },
  ],
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
            title: "Click to lock this reply on a locked variable",
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
            title: "Click to lock this reply on an unlocked variable",
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
    <div
      className={styles.node}
      style={{ width: "max-content" }}
      title={
        "The 'Replies' node gives a participant the option to choose from multiple options.\n"
        + "Each output has a number of chances compared out of the total to be reached. "
        + "You can see the exact chance in each option's calculated percentage."
      }
    >
      <NodeHandle
        type="target"
        position="left"
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
              id={`${props.id}_${index}`}
              type="source"
              position="right"
              className={styles.inlineHandle}
              isConnectable
            />
          </>
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
  // FIXME: log to support immediately
  return (
    <div
      className={styles.node}
      title="This is an error. Please contact support"
    >
      <Center>
        <strong>Unknown node</strong>
      </Center>
    </div>
  )
};

const EntryNode = (_props: NodeProps<{}>) => {
  return (
    <div
      className={styles.node}
      // FIXME: for a particular participant
      title="The node that defines the beginning of the dialogue"
    >
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
    <div
      className={styles.node}
      // FIXME: for a particular participant
      title="The 'Reroute' node helps you organize curvier dialogues with cycles"
      // FIXME: not very usable
      style={{ height: 5, width: 5 }}
    >
      <NodeHandle
        style={{
          top: 15,
          left: 1,
        }}
        position="right"
        className={styles.handle}
        isConnectable
      />
    </div>
  );
};

const withNodeContextMenu = <P extends NodeProps<{}>,R extends React.ReactNode>(Node: (a: P) => R) => {
  return (p: P) => {
    const nodeContextMenuOpts: ContextMenuOptions.Option[] = React.useMemo(() => [
      {
        id: "delete",
        onSelect: () => useAppState.setState(s => ({
          document: {
            ...s.document,
            nodes: s.document.nodes.filter(n => n.id !== p.id)
          }
        })),
      }
    ], []);

    return (
      <div>
        <ContextMenuOptions options={nodeContextMenuOpts} />
        <Node {...p} />
      </div>
    );
  };
};

const nodeTypes = {
  //FIXME: rename to dialogue line?
  dialogueEntry: withNodeContextMenu(DialogueEntryNode),
  randomSwitch: withNodeContextMenu(RandomSwitchNode),
  playerReplies: withNodeContextMenu(PlayerRepliesNode),
  lockNode: withNodeContextMenu(LockNode),
  emitNode: withNodeContextMenu(EmitNode),
  entry: withNodeContextMenu(EntryNode),
  reroute: withNodeContextMenu(RerouteNode),
  default: withNodeContextMenu(UnknownNode),
};

const nodeTypeNames: Record<keyof typeof nodeTypes, string> = {
  dialogueEntry: "Line",
  randomSwitch: "Random",
  playerReplies: "Player Replies",
  lockNode: "Lock",
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

  return <BaseEdge path={edgePath} markerEnd={markerEnd} />;
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

const TestGraphEditor = (_props: TestGraphEditor.Props) => {
  // FIXME: use correct types
  const graph = useReactFlow<{}, {}>();
  const nodes = useAppState(s => s.document.nodes);
  const edges = useAppState(s => s.document.edges);

  const dragBoxSelectMouseBinding = useAppState(s => s.preferences.graph.dragBoxSelectMouseBinding);
  const appendToSelectModifier = useAppState(s => s.preferences.graph.appendToSelectModifier);
  const dragPanMouseBinding = useAppState(s => s.preferences.graph.dragPanMouseBinding);
  const addNodeMouseBinding = useAppState(s => s.preferences.graph.addNodeMouseBinding);
  const enableBoxSelectOnDrag = useAppState(s => s.preferences.graph.enableBoxSelectOnDrag);

  const addNode = React.useCallback(
    (nodeType: string, position: {x: number, y:number}, initData?: any) => {
      useAppState.setState((s) => {
        const maybeSourceNode = connectingNodeId.current;
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

  // if any nodes changed, invalidate the drag-drop source node
  useEffect(() => connectingNodeId.current = undefined, [nodes])

  const editorRef = React.useRef<HTMLDivElement>(null);

  return (
    <GraphErrorBoundary>
      <div ref={editorRef}>
        <ContextMenuOptions
          mouseBinding={addNodeMouseBinding}
          className={styles.addNodeMenu}
          options={Object.keys(nodeTypes)
            .filter(key => key !== "entry" && key !== "default" && key !== "dialogueEntry")
            .map((nodeType) => ({
                id: nodeType,
                label: nodeTypeNames[nodeType],
                onSelect(e) {
                  const { top, left } = graphContainerElem.current!.getBoundingClientRect();
                  addNode(nodeType, graph.project({
                    x: e.clientX - left - 150/2,
                    y: e.clientY - top,
                  }));
                },
              })
            )
          }
        />
        <div className={styles.graph} ref={graphContainerElem}>
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
    </GraphErrorBoundary>
  );
}

namespace TestGraphEditor {
  export interface Props {
  }
}

export default TestGraphEditor

