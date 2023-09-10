import { useReactFlow } from "reactflow";

export const useForceUpdateNode = () => {
  const graph = useReactFlow();
  return (nodeId: string) => {
    graph.setNodes(nodes => nodes.map(n => {
      if (n.id === nodeId)
        n.data = {...n.data}; // force update
      return n;
    }));
  };
}

