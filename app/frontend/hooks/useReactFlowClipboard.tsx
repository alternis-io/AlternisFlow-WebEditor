import React, { useEffect } from "react";
import { AppState, clientIsMac, useAppState } from "../AppState";
import { useStable } from "@bentley/react-hooks";
import { useOnSelectionChange } from "reactflow";
import { assert } from "js-utils/lib/browser-utils";

// FIXME: dedup
function getNewId(nodes: { id: string }[]) {
  const maxId = nodes
    .map(n => +n.id)
    .filter(n => !Number.isNaN(n))
    .reduce((prev, cur) => prev > cur ? prev : cur, 0)
    ?? 0;
  return `${maxId + 1}`;
}

export function useReactFlowClipboard(): void {
  type NodeEdgeState = Pick<AppState["document"], "edges" | "nodes">;
  const [clipboard, setClipboard] = React.useState<NodeEdgeState | undefined>();
  const [selection, setSelection] = React.useState<NodeEdgeState | undefined>();
  useOnSelectionChange(useStable(() => ({ onChange: setSelection })));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const usesStandardModifier = (_e: typeof e) => clientIsMac ? e.metaKey : e.ctrlKey;
      const copyPressed = e.key === "c" && usesStandardModifier(e);
      const cutPressed = e.key === "x" && usesStandardModifier(e);
      const pastePressed = e.key === "v" && usesStandardModifier(e);

      if (!copyPressed && !cutPressed && !pastePressed) return;

      const copySelection = () => setClipboard(selection);

      if (copyPressed) {
        copySelection();

      } else if (cutPressed) {
        const edgeIdSet = new Set(clipboard?.edges.map(e => e.id));
        const nodeIdSet = new Set(clipboard?.nodes.map(n => n.id));
        copySelection();
        useAppState.setState(s => ({
          document: {
            ...s.document,
            nodes: s.document.nodes.filter(n => !nodeIdSet.has(n.id)),
            edges: s.document.edges.filter(e => !edgeIdSet.has(e.id)),
          },
        }));

      } else if (pastePressed) {
        useAppState.setState(s => {
          const nodeRemapTable = new Map(selection?.nodes.map(({id}) => [id, getNewId(s.document.nodes)] as const));
          const edgeRemapTable = new Map(selection?.edges.map(({id}) => [id, getNewId(s.document.edges)] as const));

          // as defined in NodeHandle, all handles follow the pattern: `${props.nodeId}_${props.type}_${props.index}`
          const remapHandle = (handle: string) => {
            const endNodeIdIndex = handle.indexOf("_");
            assert(endNodeIdIndex !== -1, `encountered an invalid node handle: '${handle}'`);
            const nodeId = handle.slice(0, endNodeIdIndex);
            const remappedNodeId = nodeRemapTable.get(nodeId);
            if (remappedNodeId === undefined) return undefined;
            return `${remappedNodeId}_${handle.slice(endNodeIdIndex + 1)}`;
          };

          return {
            document: {
              ...s.document,
              nodes: selection
                ? s.document.nodes.concat(selection.nodes.map(n => ({
                  ...n,
                  id: nodeRemapTable.get(n.id)!,
                  // FIXME: get mouse last position
                  position: { x: n.position.x + 200, y: n.position.y + 200 },
                })))
                : s.document.nodes,
              edges: selection
                ? s.document.edges.concat(selection.edges.map(e => ({
                  ...e,
                  id: edgeRemapTable.get(e.id)!,
                  source: nodeRemapTable.get(e.source) ?? e.source,
                  target: nodeRemapTable.get(e.target) ?? e.target,
                  sourceHandle: e.sourceHandle && remapHandle(e.sourceHandle) || e.sourceHandle,
                  targetHandle: e.targetHandle && remapHandle(e.targetHandle) || e.targetHandle,
                })))
                : s.document.edges,
            },
          };
        });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [clipboard, selection]);
}
