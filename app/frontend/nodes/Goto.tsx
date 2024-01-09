import React from "react";
import { NodeProps, Position } from "reactflow";
import { NodeHandle } from "./handle";
import { getNode, makeNodeDataSetter, useAppState } from "../AppState";
import { Center } from "../Center";
import styles from "../TestGraphEditor.module.css";
import { BaseNode } from "./BaseNode";
import { Goto } from "./data";

export function GotoNode(props: GotoNode.Props) {
  const nodes = useAppState(s => s.document.nodes);
  const targets = nodes.filter(n => n.data?.label).map(n => n.data?.label) as string[];
  const data = getNode<Goto>(props.id)?.data;
  const set = makeNodeDataSetter<Goto>(props.id);

  return (
    <BaseNode
      id={props.id}
      data-tut-id="node-goto"
      title={"A Goto node jumps to any labeled node"}
      noLabel
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
        go to label
        {/* FIXME: use react-(multi)select */}
        <select
          value={data?.target}
          onChange={e => set(() => ({ target: e.currentTarget.value }))}
          style={{ maxWidth: 150 }}
        >
          {targets
            .map((jumpTarget) => (
              <option key={jumpTarget} value={jumpTarget}>
                <span>{jumpTarget}</span>
                {/* FIXME: replace find in map with a search button, possibly using a webfont... */}
                {/*<div title="Find in graph" style={{backgroundColor: "red"}}>
                  <em>find</em>
                  <svg width="15px" height="15px" viewBox="0 0 10 10">
                    <circle x={0} y={0} r={5} />
                    <path d={"M0 0 l 5 5"} />
                  </svg>
                </div>*/}
              </option>
            )
          )}
        </select>
      </label>
    </BaseNode>
  );
}

export namespace GotoNode {
  export interface Props extends NodeProps<Goto> {}
}
