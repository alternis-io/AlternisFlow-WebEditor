import React from "react";
import { NodeProps, Position } from "reactflow";
import { NodeHandle } from "./handle";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";
import { Center } from "../Center";
import styles from "../TestGraphEditor.module.css";
import { BaseNode } from "./BaseNode";

export interface Goto {
  target: string;
}

export function GotoNode(props: GotoNode.Props) {
  const nodes = useAppState(s => s.document.nodes);
  const targets = nodes.filter(n => n.data?.jumpLabel);
  const data = getNode<Goto>(props.id)?.data;
  const set = makeNodeDataSetter<Goto>(props.id);

  return (
    <BaseNode id={props.id}>
      <div
        className={styles.node}
        style={{ width: "max-content" }}
        title={
          "The 'Goto' node, moves the conversation to any labeled node"
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
          <span style={{ fontSize: "4rem", fontWeight: "bold" }}>→</span>
        </Center>
        <label>
          event
          {/* FIXME: use react-(multi)select */}
          <select
            value={data.target}
            onChange={e => set(() => ({ target: e.currentTarget.value }))}
          >
            {targets
              .map(([jumpTarget]) => (
                <option key={jumpTarget} value={jumpTarget}>
                  {/* replace find in map with a search button */}
                  <span>{jumpTarget}</span> <span title="Find in graph">
                    find in map
                  </span>
                </option>
              )
            )}
          </select>
        </label>
      </div>
    </BaseNode>
  );
}

export namespace GotoNode {
  export interface Props extends NodeProps<{}> {

  }
}
