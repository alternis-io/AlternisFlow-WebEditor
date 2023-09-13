import { useEffect, useRef } from "react"
import { assert } from "../browser-utils";

export function usePrevValue<T>(current: T): T | undefined {
  const prevRef = useRef<T | undefined>(undefined);
  useEffect(() => { prevRef.current = current; });
  const previous = prevRef.current;
  return previous;
}

export function useWithPrevDepsEffect<V extends readonly unknown[]>(
  effect: (prev: Partial<V>) => ReturnType<typeof useEffect>,
  values: V
): void {
  const prevRef = useRef<Partial<V>>(new Array(values.length).fill(undefined) as any as Partial<V>);
  useEffect(() => { prevRef.current = values; });

  const previous = prevRef.current;
  assert(previous === undefined || previous.length === values.length, "changed amount of params!");

  useEffect(() => effect(previous), values);
}
