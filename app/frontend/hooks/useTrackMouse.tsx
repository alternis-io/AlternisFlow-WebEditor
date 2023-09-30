import { useEffect, useRef } from "react";

export function useTrackMouse() {
  const position = useRef({ pageX: 0, pageY: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      position.current = {
        pageX: e.pageX,
        pageY: e.pageY,
      };
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  });

  return {
    position
  };
}
