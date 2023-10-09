import { useRef, useEffect } from "react";
import debounce from "lodash.debounce";

// FIXME: support cleanup
export function useDebouncedEffect(effect: () => void, deps: any[]) {
  const latestEffect = useRef(effect);
  latestEffect.current = effect;

  const stableDebouncedEffect = useRef(debounce(() => latestEffect.current())).current;

  useEffect(() => {
    stableDebouncedEffect();
  }, deps);
}
