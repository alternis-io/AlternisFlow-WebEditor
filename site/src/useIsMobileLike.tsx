import { useMediaQuery } from "@bentley/react-hooks";

export function useIsMobileLike() {
  return useMediaQuery("(min-width: 700px)");
}
