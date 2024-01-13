import React, { useEffect } from "react";
import { Dialogue, clientIsMac, useAppState, useCurrentDialogue, Node } from "../AppState";
import { XYPosition, useOnSelectionChange, useReactFlow } from "reactflow";
import { assert } from "js-utils/lib/browser-utils";
import { useTrackMouse } from "./useTrackMouse";

// FIXME: dedup
function getNewId(nodes: { id: string }[]) {
  const maxId = nodes
    .map(n => +n.id)
    .filter(n => !Number.isNaN(n))
    .reduce((prev, cur) => prev > cur ? prev : cur, 0)
    ?? 0;
  return `${maxId + 1}`;
}

export function useReactFlowClipboard(args: {
  graphContainerElem: React.RefObject<HTMLDivElement>,
}): void {
  type NodeEdgeState = Pick<Dialogue, "edges" | "nodes">;
  //const [clipboard, setClipboard] = React.useState<NodeEdgeState | undefined>();
  //const [selection, setSelection] = React.useState<NodeEdgeState | undefined>();
  const clipboard = React.useRef<NodeEdgeState>();
  const selection = React.useRef<NodeEdgeState>();
  useOnSelectionChange({ onChange: (s) => (selection.current = {
    nodes: s.nodes as Node[],
    edges: s.edges,
  })});

  const graph = useReactFlow();
  const { position } = useTrackMouse();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const usesStandardModifier = (_e: typeof e) => clientIsMac ? e.metaKey : e.ctrlKey;
      const copyPressed = e.key === "c" && usesStandardModifier(e);
      const cutPressed = e.key === "x" && usesStandardModifier(e);
      const pastePressed = e.key === "v" && usesStandardModifier(e);

      if (!copyPressed && !cutPressed && !pastePressed) return;

      const copySelection = () => clipboard.current = selection.current;

      if (copyPressed) {
        copySelection();

      } else if (cutPressed) {
        const edgeIdSet = new Set(clipboard.current?.edges.map(e => e.id));
        const nodeIdSet = new Set(clipboard.current?.nodes.map(n => n.id));
        copySelection();
        useCurrentDialogue.setState(s => ({
          nodes: s.nodes.filter(n => !nodeIdSet.has(n.id)),
          edges: s.edges.filter(e => !edgeIdSet.has(e.id)),
        }));

      } else if (pastePressed) {
        useCurrentDialogue.setState(s => {
          if (selection.current === undefined)
            return s;

          let nodeRemapTable = new Map<string, string>();
          let edgeRemapTable = new Map<string, string>();
          {
            let nextNodeId = +getNewId(s.nodes);
            for (const { id }  of selection.current.nodes)
              nodeRemapTable.set(id, String(nextNodeId++));

            let nextEdgeId = +getNewId(s.edges);
            for (const { id }  of selection.current.edges)
              edgeRemapTable.set(id, String(nextEdgeId++));
          }

          // as defined in NodeHandle, all handles follow the pattern: `${props.nodeId}_${props.type}_${props.index}`
          const remapHandle = (handle: string) => {
            const endNodeIdIndex = handle.indexOf("_");
            assert(endNodeIdIndex !== -1, `encountered an invalid node handle: '${handle}'`);
            const nodeId = handle.slice(0, endNodeIdIndex);
            const remappedNodeId = nodeRemapTable.get(nodeId);
            if (remappedNodeId === undefined) return undefined;
            return `${remappedNodeId}_${handle.slice(endNodeIdIndex + 1)}`;
          };

          const basePosition = {
            x: selection.current.nodes.reduce((prev, n) => Math.min(n.position.x, prev), Number.POSITIVE_INFINITY),
            y: selection.current.nodes.reduce((prev, n) => Math.min(n.position.y, prev), Number.POSITIVE_INFINITY),
          };

          // FIXME: use this
          const reposition = (p: XYPosition): XYPosition => {
            const { top, left } = args.graphContainerElem.current!.getBoundingClientRect();
            // FIXME: this should use the clientX/Y within the graphContainerElem, not position.current.pageX...
            return graph.project({
              x: position.current.pageX - left - 150/2 + (p.x - basePosition.x),
              y: position.current.pageY - top + (p.y - basePosition.y),
            });
          };

          return {
            nodes: s.nodes.concat(selection.current.nodes.map(n => ({
              ...n,
              id: nodeRemapTable.get(n.id)!,
              position: { x: n.position.x + 200, y: n.position.y + 200 },
            }))),
            edges: s.edges.concat(selection.current.edges.map(e => ({
              ...e,
              id: edgeRemapTable.get(e.id)!,
              source: nodeRemapTable.get(e.source) ?? e.source,
              target: nodeRemapTable.get(e.target) ?? e.target,
              sourceHandle: e.sourceHandle && remapHandle(e.sourceHandle) || e.sourceHandle,
              targetHandle: e.targetHandle && remapHandle(e.targetHandle) || e.targetHandle,
            }))),
          };
        });
      }
    };

    // FIXME: why capture?
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [graph]);
}
