import { assert } from "js-utils/lib/browser-utils";
import { AppState } from "./AppState";
import type { NodeTypes } from "./TestGraphEditor";
import { DialogueEntry, PlayerReplies, RandomSwitch, Lock, Emit } from "./nodes/data";


/** export to the external format */
export function exportToJson(doc: AppState["document"]) {
  let entryId: number | undefined;
  const nodes: any[] = [];

  const perNodeOutputs = new Map<number, number[]>();

  for (const edge of doc.edges) {
    assert(edge.sourceHandle && edge.targetHandle, "handle ids are invalid!");

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
      perNodeOutputs.set(sourceNodeId, nodeOutputs);
    }

    nodeOutputs[sourceHandleIndex] = targetNodeId;
  }

  for (const node of doc.nodes) {
    const id = +node.id;
    assert(!Number.isNaN(id), `node id '${node.id}' not an integer`);
    const type = node.type as NodeTypes;
    const nexts = perNodeOutputs.get(id);
    const next = nexts?.[0];

    // FIXME: type this stuff
    const exportedNode: Record<string, any> = {
      id: +node.id,
    };

    if (type === "dialogueEntry") {
      const data = node.data as DialogueEntry;
      exportedNode.line = {
        data: {
          speaker: doc.participants[data.speakerIndex],
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
      entryId = id;
      continue; // skip push
    }

    else if (type === "reroute") {
      continue; // skip push
    }

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
