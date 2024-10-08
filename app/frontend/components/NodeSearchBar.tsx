import { useReactFlow } from "reactflow";
import { PlayerReplies, DialogueEntry } from "../nodes/data";
import React from "react";
import { Node, useCurrentDialogue } from "../AppState";
import type { NodeTypes } from "../TestGraphEditor";
import { useWithPrevDepsEffect } from "../hooks/usePrevValue";
import { ReactComponent as MagnifyingGlass } from "../images/magnifying-glass.svg";

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

  const currentDialogue = useCurrentDialogue();

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
    for (const node of currentDialogue.nodes) {
      if (node.type === undefined) continue;
      // FIXME: type these strings! (node.type?)
      matchers[node.type]?.(searchAsRegex, node);
    }

    return matches;
  }, [currentDialogue.nodes, searchAsRegex]);

  const [matchIndex, setMatchIndex] = React.useState<number>();

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen])


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
    <>
      <button
        className={"alternis__toolBtn alternis__hoverable"}
        onClick={() => setSearchOpen(p => !p)}
      >
        <MagnifyingGlass width={20} height={20} className="alternis__center" />
      </button>
      {searchOpen &&
        <div style={{ position: "absolute", top: "100%", right: 0 }}>
          <input
            ref={searchInputRef}
            placeholder={"search node text"}
            value={searchInput ?? ""}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
          />
          <button
            style={{ height: 25, width: 25 }}
            className={"alternis__toolBtn"}
            disabled={matchIndex === undefined}
            onClick={() => matchIndex !== undefined && setMatchIndex(p =>
              p === undefined
              ? undefined
              : p === 0
              ? matches.length - 1
              : p - 1
            )}
          >
            <strong>&lt;</strong>
          </button>
          <button
            style={{ height: 25, width: 25 }}
            className={"alternis__toolBtn"}
            disabled={matchIndex === undefined}
            onClick={() => matchIndex !== undefined && setMatchIndex(p =>
              p === undefined
              ? undefined
              : p === matches.length - 1
              ? 0
              : p + 1
            )}
          >
            <strong>&gt;</strong>
          </button>
          <span>{(matchIndex ?? -1)+1}/{matches.length}</span>
        </div>
      }
    </>
  );
}
