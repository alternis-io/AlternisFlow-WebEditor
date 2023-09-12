/** Utilities for JSX */

/**
 * use like
 * @example
 * <div {...classNames("a", c && "d")} />
 */
export const classNames = (cx: any[]) =>
  ({ className: cx.filter(Boolean).map(String).join(" ") });
