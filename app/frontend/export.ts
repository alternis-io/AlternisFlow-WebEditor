import { assert } from "js-utils/lib/browser-utils";
import { AppState } from "./AppState";
import type { NodeTypes } from "./TestGraphEditor";
import { DialogueEntry, PlayerReplies, RandomSwitch, Lock, Emit, Goto, BaseNodeData } from "./nodes/data";
import { Node } from "reactflow";

/** export to the external format */
export function exportToJson(doc: AppState["document"]) {
  const nodes: any[] = [];

  const nodeByIdMap = new Map(doc.nodes.map(n => [n.id, n]));
  const nodeOutputsMap = new Map<string, string[]>();

  for (const edge of doc.edges) {
    assert(edge.sourceHandle && edge.targetHandle);

    const [startNodeId, startHandleType, startHandleIndex] = edge.sourceHandle.split("_");
    const [endNodeId, _endHandleType, endHandleIndex] = edge.targetHandle.split("_");
    const isReverseEdge = startHandleType === "target";

    const [sourceNodeId, targetNodeId, sourceHandleIndex]
      = isReverseEdge
      ? [endNodeId, startNodeId, +endHandleIndex]
      : [startNodeId, endNodeId, +startHandleIndex]
    ;

    assert(
      !Number.isNaN(sourceNodeId)
      && !Number.isNaN(targetNodeId)
      && !Number.isNaN(sourceHandleIndex),
      "invalid connection found"
    );

    let nodeOutputs = nodeOutputsMap.get(sourceNodeId);
    if (nodeOutputs === undefined) {
      nodeOutputs = [];
      nodeOutputsMap.set(sourceNodeId, nodeOutputs);
    }
    nodeOutputs[sourceHandleIndex] = targetNodeId;
  }

  // NOTE: can probably skip this...
  const entry = doc.nodes.find(n => n.type as NodeTypes === "entry");
  assert(entry);

  const localToExportedIdMap = new Map<string, number>();
  const remapNodeId = (nodeId: string) => {
    let mapped = localToExportedIdMap.get(nodeId);
    if (mapped === undefined) {
      mapped = localToExportedIdMap.size;
      localToExportedIdMap.set(nodeId, mapped);
    }
    return mapped;
  };

  function getAndRemapNodeAsNext(nodeId: string | undefined) {
    if (nodeId === undefined) return undefined;

    const node = nodeByIdMap.get(nodeId);
    assert(node, "bad node id");

    const nextId = node.type as NodeTypes === "goto"
      ? doc.nodes
        .find(n => n.data?.label && n.data.label === (node.data as Goto).target)?.id
      : nodeId;
    assert(nextId, `invalid raw next id, probably a bad goto label: '${(node.data as Goto).target}'`);

    return remapNodeId(nextId);
  }

  const nodeHandlers: {
    [K in NodeTypes]?: {
      data?(
        node: Node<BaseNodeData>,
        ctx: { outputs: string[], pushNode: (patch: any) => void }
      ): void,
      visit?(ctx: { outputs: string[] }): void,
    }
  } = {
    entry: {
      visit(ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) visit(node);
      }
    },

    dialogueEntry: {
      data(node, ctx) {
        const data = node.data as DialogueEntry;
        const next = getAndRemapNodeAsNext(ctx.outputs[0]);
        ctx.pushNode({
          line: {
            data: {
              speaker: doc.participants[data.speakerIndex].name,
              text: data.text,
              metadata: data.customData,
            },
            next,
          },
        });
      },
      visit(ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) visit(node);
      },
    },

    randomSwitch: {
      data(node, ctx) {
        const data = node.data as RandomSwitch;
        const nexts = ctx.outputs.map(getAndRemapNodeAsNext);
        ctx.pushNode({
          random_switch: {
            nexts,
            chances: data.proportions,
          },
        });
      },
      visit(ctx) {
        for (const out of ctx.outputs) {
          const node = nodeByIdMap.get(out);
          if (node) visit(node);
        }
      },
    },

    playerReplies: {
      data(node, ctx) {
        const data = node.data as PlayerReplies;
        const nexts = ctx.outputs.map(getAndRemapNodeAsNext);
        ctx.pushNode({
          reply: {
            nexts,
            texts: data.replies.map(r => r.text),
          },
        });
      },
      visit(ctx) {
        for (const out of ctx.outputs) {
          const node = nodeByIdMap.get(out);
          if (node) visit(node);
        }
      },
    },

    lockNode: {
      data(node, ctx) {
        const next = getAndRemapNodeAsNext(ctx.outputs[0]);
        const data = node.data as Lock;
        ctx.pushNode({
          [data.action]: {
            booleanVariableName: data.variable,
            next,
          },
        });
      },
      visit(ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) visit(node);
      },
    },

    emitNode: {
      data(node, ctx) {
        const next = getAndRemapNodeAsNext(ctx.outputs[0]);
        const data = node.data as Emit;
        ctx.pushNode({
          call: {
            functionName: data.function,
            next,
          },
        });
      },
      visit(ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) visit(node);
      },
    },

    goto: {
      data() {},
      visit() {}
    },
  };

  const alreadyVisited = new Set();
  function visit(node: Node<BaseNodeData>) {
    if (alreadyVisited.has(node))
      return;
    const id = remapNodeId(node.id);

    const type = node.type as NodeTypes;
    const outputs = nodeOutputsMap.get(node.id) ?? [];
    const nexts = outputs.map(remapNodeId);
    const next = nexts?.[0];

    // FIXME: better types
    const exportedNode: Record<string, any> = { id };
    const pushNode = (patch: any) => nodes.push({ ...exportedNode, ...patch });

    if (node.type !== undefined && ((node.type in nodeHandlers) || node.type === "entry")) {
      const handler = nodeHandlers[node.type as NodeTypes];
      handler?.data?.(node, { outputs, pushNode });
      handler?.visit?.({ outputs });
    } else {
      assert(false, `unknown node type: ${type}`);
    }
  }

  visit(entry);

  return {
    version: 1,
    entryId: 0,
    nodes,
  };
}

