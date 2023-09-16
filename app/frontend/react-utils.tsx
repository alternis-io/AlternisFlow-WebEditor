/** Utilities for JSX (and apparently react too) */

import { useStable } from "@bentley/react-hooks";
import { useState } from "react";

/**
 * use like
 * @example
 * <div {...classNames("a", c && "d")} />
 */
export const classNames = (...cx: any[]) =>
  ({ className: cx.filter(Boolean).map(String).join(" ") });

export const makeInaccessibleObject = <T extends object>(message: string) => new Proxy({} as T, {
  get() {
    throw Error(`Attempted to get a field on an inaccessible object: ${message}`);
  }
})

// FIXME: move to non-react utils
export function deepCloneJson<T>(t: T): T {
  return JSON.parse(JSON.stringify(t));
}

export function useForceUpdate() {
  const [, _setFakeState] = useState(0);
  return useStable(() => _setFakeState(p => p + 1));
}
