import { assert } from "js-utils/lib/browser-utils";
import { AppState } from "./AppState";
import type { NodeTypes } from "./TestGraphEditor";
import { DialogueEntry, PlayerReplies, RandomSwitch, Lock, Emit, Goto } from "./nodes/data";


/** export to the external format */
export function exportToJson(doc: AppState["document"]) {
  let entryId: number | undefined;
  const nodes: any[] = [];

  const perNodeOutputs = new Map<number, number[]>();

  // FIXME: make entryIndex static (0)
  const entryIndex = doc.nodes.findIndex(n => n.type as NodeTypes === "entry");
  // FIXME: would be nice to not rebuild this map every export...
  // FIXME: test this!
  const nodeIdToIndexMap = new Map(doc.nodes
    //.filter(n => (n.type as NodeTypes) !== "goto")
    .map((n, i) => [
      +n.id,
      entryIndex !== -1 && i >= entryIndex
        ? i - 1
        : i
    ]));

  const remapNodeId = (nodeId: string | number): number => {
    if (typeof nodeId === "string") {
      const id = +nodeId;
      assert(!Number.isNaN(id), `invalid node id: '${nodeId}'`);
      nodeId = id;
    }
    return nodeIdToIndexMap.get(nodeId) ?? assert(false, `unknown node id: '${nodeId}'`) as never;
  };

  for (const edge of doc.edges) {
    assert(edge.sourceHandle && edge.targetHandle);

    const [startNodeId, startHandleType, startHandleIndex] = edge.sourceHandle.split("_");
    const [endNodeId, _endHandleType, endHandleIndex] = edge.targetHandle.split("_");
    const isReverseEdge = startHandleType === "target";

    const [sourceNodeId, targetNodeRawId, sourceHandleIndex]
      = isReverseEdge
      ? [+endNodeId, startNodeId, +endHandleIndex]
      : [+startNodeId, endNodeId, +startHandleIndex]
    ;
    const targetNodeId = +targetNodeRawId;

    assert(
      !Number.isNaN(sourceNodeId)
      && !Number.isNaN(targetNodeId)
      && !Number.isNaN(sourceHandleIndex),
      "invalid connection found"
    );

    let nodeOutputs = perNodeOutputs.get(remapNodeId(sourceNodeId));
    if (nodeOutputs === undefined) {
      nodeOutputs = [];
      perNodeOutputs.set(remapNodeId(sourceNodeId), nodeOutputs);
    }

    // is this worth caching?
    const targetNode = doc.nodes.find(n => n.id === targetNodeRawId);
    assert(targetNode, `couldn't find target node for edge '${edge.id}'`)

    const nextRawId = targetNode.type === "goto"
      ? doc.nodes.find(n => n.data?.label && n.data.label === (targetNode.data as Goto).target)?.id
      : targetNodeId;

    assert(nextRawId, `invalid raw next id, probably a bad goto label: '${
      (targetNode.data as Goto).target
    }'`);

    const nextId = +nextRawId;
    assert(!Number.isNaN(nextId), "invalid next id");

    nodeOutputs[sourceHandleIndex] = remapNodeId(nextId);
  }

  for (const node of doc.nodes) {
    const type = node.type as NodeTypes;
    const nexts = perNodeOutputs.get(remapNodeId(node.id));
    const next = nexts?.[0];

    // FIXME: better types
    const exportedNode: Record<string, any> = {
      id: remapNodeId(node.id),
    };

    if (type === "dialogueEntry") {
      const data = node.data as DialogueEntry;
      exportedNode.line = {
        data: {
          speaker: doc.participants[data.speakerIndex].name,
          text: data.text,
          metadata: data.customData,
        },
        next,
      };
    }

    else if (type === "randomSwitch") {
      const data = node.data as RandomSwitch;
      exportedNode.random_switch = {
        nexts,
        chances: data.proportions,
      };
    }

    else if (type === "playerReplies") {
      const data = node.data as PlayerReplies;
      exportedNode.reply = {
        nexts,
        texts: data.replies.map(r => r.text),
      };
    }

    else if (type === "lockNode") {
      const data = node.data as Lock;
      exportedNode[data.action] = {
        // FIXME: not supported yet
        booleanVariableIndex: 0,
        next,
      };
    }

    else if (type === "emitNode") {
      const data = node.data as Emit;
      exportedNode.call = {
        // FIXME: not supported yet
        functionIndex: 0,
        next,
      };
    }

    else if (type === "entry") {
      entryId = next;
      continue; // skip push
    }

    // FIXME: support this
    else if (type === "goto") {
      continue; // skip push
    }

    else {
      assert(false, `unknown node type: ${type}`);
    }

    nodes[exportedNode.id] = exportedNode;
  }

  assert(entryId !== undefined);

  return {
    version: 1,
    entryId,
    nodes,
  };
}
