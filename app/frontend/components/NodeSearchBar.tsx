import { useReactFlow } from "reactflow";
import { PlayerReplies, DialogueEntry } from "../nodes/data";
import React from "react";
import { Node, useCurrentDialogue, useAppState } from "../AppState";
import type { NodeTypes } from "../TestGraphEditor";
import { useWithPrevDepsEffect } from "../hooks/usePrevValue";

function useWildcardSearch(search: string | undefined) {
  return React.useMemo(() => {
    if (search === undefined)
      return search;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wildcardsConverted = escaped.replace(/\\\*/g, ".*");
    return new RegExp(wildcardsConverted, "sgi");
  }, [search]);
}

export function NodeSearchBar() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState<string>();
  // FIXME: use fuzzy find
  const searchAsRegex = useWildcardSearch(searchInput);
  const graph = useReactFlow();

  const matches = React.useMemo(() => {
    if (searchAsRegex === undefined)
      return [];

    const matches = [] as Node[];

    const matchers: Partial<Record<NodeTypes, (r: RegExp, n: Node) => void>> = {
      dialogueEntry: (r, node) => {
        if (r.test((node.data as DialogueEntry).text))
          matches.push(node);
      },
      playerReplies: (r, node) => {
        if ((node.data as PlayerReplies).replies.some(reply => r.test(reply.text)))
          matches.push(node);
      },
    };

    const currentDialogue = useCurrentDialogue.getState();
    for (const node of currentDialogue?.nodes ?? []) {
      if (node.type === undefined) continue;
      // FIXME: type these strings!
      matchers[node.type]?.(searchAsRegex, node);
    }

    return matches;
  }, [searchAsRegex]);

  const [matchIndex, setMatchIndex] = React.useState<number>();

  const currentNode = React.useMemo(() =>
    matchIndex !== undefined
      ? matches[matchIndex]
      : undefined,
    [matches, matchIndex],
  );

  useWithPrevDepsEffect(([prevMatches]) => {
    const hadMatches = prevMatches !== undefined && prevMatches.length > 0;
    const hasMatches = matches.length > 0;
    if (!hadMatches && hasMatches)
      setMatchIndex(0);
    if (hadMatches && !hasMatches)
      setMatchIndex(undefined);
  }, [matches]);

  useWithPrevDepsEffect(([prevCurrentNode]) => {
    if (prevCurrentNode !== currentNode && currentNode) {
      graph.setCenter(currentNode.position.x, currentNode.position.y, { duration: 0.7 });
    }
  }, [currentNode]);

  return (
    <div>
      <button
        className={"alternis__toolBtn"}
        onClick={() => setSearchOpen(p => !p)}
      >
        <strong>search</strong>
      </button>
      {searchOpen &&
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.currentTarget.value)}
        />
      }
      {matchIndex !== undefined && matches.length > 0 && (
        <div>
          <button
            className={"alternis__toolBtn"}
            onClick={() => setMatchIndex(p =>
              p === undefined
              ? undefined
              : p === 0
              ? matches.length - 1
              : p - 1
            )}
          >
            <strong>previous</strong>
          </button>
          <button
            className={"alternis__toolBtn"}
            onClick={() => setMatchIndex(p =>
              p === undefined
              ? undefined
              : p === matches.length - 1
              ? 0
              : p + 1
            )}
          >
            <strong>next</strong>
          </button>
          <span>{matchIndex+1}/{matches.length}</span>
        </div>
      )}
    </div>
  );
}