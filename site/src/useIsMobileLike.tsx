import { useMediaQuery } from "@bentley/react-hooks";

export function useIsMobileLike() {
  return typeof globalThis.window !== "undefined"
    ? useMediaQuery("(min-width: 700px)")
    : false;
}
