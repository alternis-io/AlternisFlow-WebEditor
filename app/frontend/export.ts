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
      mapped = localToExportedIdMap.size + 1;
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
    [K in NodeTypes]: {
      /** should return a reference to the exported node
       * which "visit" my edit as children are visited */
      data(
        node: Node<BaseNodeData>,
        ctx: { outputs: string[], pushNode: (patch: any) => void }
      ): any,
      visit?(exportedNode: any, ctx: { outputs: string[] }): void,
    }
  } = {
    entry: {
      data() {},
      visit(_data, ctx) {
        const nextNode = nodeByIdMap.get(ctx.outputs[0]);
        if (nextNode) visit(nextNode.id);
      }
    },

    dialogueEntry: {
      data(node, ctx) {
        const data = node.data as DialogueEntry;
        const exportedNode = {
          line: {
            data: {
              speaker: doc.participants[data.speakerIndex].name,
              text: data.text,
              metadata: data.customData,
            },
          },
        }
        ctx.pushNode(exportedNode);
        return exportedNode;
      },
      visit(exportedNode, ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) {
          exportedNode.line.next = getAndRemapNodeAsNext(node.id);
          visit(node.id);
        }
      },
    },

    randomSwitch: {
      data(node, ctx) {
        const data = node.data as RandomSwitch;
        const exportedNode = {
          random_switch: {
            nexts: [],
            chances: data.proportions,
          },
        };
        ctx.pushNode(exportedNode);
        return exportedNode;
      },
      visit(exportedNode, ctx) {
        for (const out of ctx.outputs) {
          const node = nodeByIdMap.get(out);
          if (node) {
            exportedNode.random_switch.nexts.push(getAndRemapNodeAsNext(node.id));
            visit(node.id);
          }
        }
      },
    },

    playerReplies: {
      data(node, ctx) {
        const data = node.data as PlayerReplies;
        const exportedNode = {
          reply: {
            nexts: [],
            texts: data.replies.map(r => ({
              text: r.text,
              speaker: data.speaker !== undefined && doc.participants[data.speaker].name,
              metadata: undefined,
            })),
            conditions: data.replies.map(r => ({
              action: r.condition,
              variable: r.lockVariable,
            })),
          },
        };
        ctx.pushNode(exportedNode);
        return exportedNode;
      },
      visit(exportedNode, ctx) {
        for (const out of ctx.outputs) {
          const node = nodeByIdMap.get(out);
          if (node) {
            exportedNode.reply.nexts.push(getAndRemapNodeAsNext(node.id));
            visit(node.id);
          }
        }
      },
    },

    lockNode: {
      data(node, ctx) {
        const data = node.data as Lock;
        const exportedNode = {
          [data.action]: {
            boolean_var_name: data.variable,
          },
        };
        ctx.pushNode(exportedNode);
        return exportedNode;
      },
      visit(exportedNode, ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        const dataAction = "lock" in exportedNode ? "lock" : "unlock";
        if (node) {
          exportedNode[dataAction].next = getAndRemapNodeAsNext(node.id);
          visit(node.id);
        }
      },
    },

    emitNode: {
      data(node, ctx) {
        const data = node.data as Emit;
        const exportedNode = {
          call: {
            function_name: data.function,
          },
        };
        ctx.pushNode(exportedNode);
        return exportedNode;
      },
      visit(exportedNode, ctx) {
        const node = nodeByIdMap.get(ctx.outputs[0]);
        if (node) {
          exportedNode.call.next = getAndRemapNodeAsNext(node.id);
          visit(node.id);
        }
      },
    },

    goto: {
      data() {},
    },

    default: {
      data(node) {
        assert(false, `unknown node: ${node.id}`);
      },
    },
  };

  const alreadyVisited = new Set<string>();

  function visit(nodeId: string) {
    if (alreadyVisited.has(nodeId))
      return;

    alreadyVisited.add(nodeId);

    const node = nodeByIdMap.get(nodeId);
    assert(node, "bad node id");

    const type = node.type as NodeTypes | undefined;
    const outputs = nodeOutputsMap.get(nodeId) ?? [];

    const pushNode = (node: any) => nodes.push(node);

    if (type !== undefined && ((type in nodeHandlers) || node.type === "entry")) {
      const handler = nodeHandlers[type];
      const result = handler.data(node, { outputs, pushNode });
      handler.visit?.(result, { outputs });
    } else {
      assert(false, `unknown node type: ${type}`);
    }
  }

  visit(entry.id);

  return {
    version: 1,
    entryId: 0,
    nodes,
    participants: doc.participants.map(p => ({ name: p.name })),
    functions: Object.entries(doc.functions).map(([name]) => ({ name })),
    variables: {
      boolean: Object.entries(doc.variables)
        .filter(([, v]) => v.type === "boolean")
        .map(([name]) => ({ name })),
      // FIXME: warn on variable references in a line that aren't in here, that is invalid!
      string: Object.entries(doc.variables)
        .filter(([, v]) => v.type === "string")
        .map(([name]) => ({ name })),
    },
  };
}

