import { assert } from "js-utils/lib/browser-utils";
import { AppState } from "./AppState";
import type { NodeTypes } from "./TestGraphEditor";
import { DialogueEntry, PlayerReplies, RandomSwitch, Lock, Emit } from "./nodes/data";


/** export to the external format */
export function exportToJson(doc: AppState["document"]) {
  let entryId: number | undefined;
  const nodes: any[] = [];

  const perNodeOutputs = new Map<number, number[]>();
  const nodeIdToIndexMap = new Map(doc.nodes.map((n, i) => [+n.id, i]));
  const remapNodeId = (nodeId: string | number): number => {
    if (typeof nodeId === "string") {
      const id = +nodeId;
      assert(!Number.isNaN(id), `invalid node id: '${nodeId}'`);
      nodeId = id;
    }
    return nodeIdToIndexMap.get(nodeId) ?? assert(false, "unknown node id") as never;
  };

  for (const edge of doc.edges) {
    if (!edge.sourceHandle || !edge.targetHandle) {
      perNodeOutputs.set(
        remapNodeId(edge.source),
        [remapNodeId(edge.target)],
      );
      continue;
    }

    const [startNodeId, startHandleType, startHandleIndex] = edge.sourceHandle.split("_");
    const [endNodeId, _endHandleType, endHandleIndex] = edge.targetHandle.split("_");
    const isReverseEdge = startHandleType === "target";

    const [sourceNodeId, targetNodeId, sourceHandleIndex]
      = isReverseEdge
      ? [+endNodeId, +startNodeId, +endHandleIndex]
      : [+startNodeId, +endNodeId, +startHandleIndex]
    ;

    assert(
      !Number.isNaN(sourceNodeId)
      && !Number.isNaN(targetNodeId)
      && !Number.isNaN(sourceHandleIndex),
      "invalid connection found"
    );

    let nodeOutputs = perNodeOutputs.get(sourceNodeId);
    if (nodeOutputs === undefined) {
      nodeOutputs = [];
      perNodeOutputs.set(remapNodeId(sourceNodeId), nodeOutputs);
    }

    nodeOutputs[sourceHandleIndex] = remapNodeId(targetNodeId);
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

    // FIXME: remove reroutes
    else if (type === "reroute") {
      continue; // skip push
    }

    // FIXME: support this
    else if (type === "goto") {
      continue; // skip push
    }

    else {
      assert(false, `unknown node type: ${type}`);
    }

    nodes.push(exportedNode);
  }

  assert(entryId);

  return {
    version: 1,
    entryId,
    nodes,
  }
}
