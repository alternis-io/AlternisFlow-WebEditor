/** Utilities for JSX (and apparently react too) */

import * as React from "react";

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
  const [, _setFakeState] = React.useState(0);
  return React.useRef(() => _setFakeState(p => p + 1)).current;
}

/**
 * Returns html props that can be put on an HTML element, and will
 * call a callback (after a delay) upon no longer being interacted with
 */
export function useOnNoLongerMouseInteracted({
  /**
   * the amount of time with mouse outside the element to consider
   * it no longer interacted with
   */
  delayMs = 1_000,
  /** what to do when the element is considered no longer interacted with */
  onUninterested = () => {},
} = {}) {
  let timeout: NodeJS.Timeout | undefined;

  return React.useRef({
    props: {
      onMouseEnter: (e: React.MouseEvent) => {
        e.preventDefault();
        if (timeout) clearTimeout(timeout);
        timeout = undefined;
      },
      onMouseLeave: (e: React.MouseEvent) => {
        e.preventDefault();
        timeout = setTimeout(onUninterested, delayMs);
      },
    },
    forceInterest() {
      this.props.onMouseLeave({ preventDefault: () => {} } as React.MouseEvent);
    }
  }).current;
}

