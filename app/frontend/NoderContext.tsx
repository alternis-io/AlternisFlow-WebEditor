import React from "react";
// dialogue engine
import initLangLogic from "../../dialogue-engine/zig-out/bin/libdialogue.wasm?init";

import { makeWasmHelper } from "./wasm";

// FIXME: show loading
const langLib = await initLangLogic() as WebAssembly.Instance;
const wasmUtils = makeWasmHelper(langLib);

globalThis._noder = langLib;
globalThis._wasmUtils = wasmUtils;

/** caller must free the result */
function sourceDefinesToNodeTypes(lib: WebAssembly.Instance, source: string) {
  const marshalledSrc = wasmUtils.marshalString(source);
  const resultPtr = lib.exports.readSrc(marshalledSrc.ptr);
  const result = wasmUtils.ptrToStr(resultPtr);
  const { value } = result;
  result.free();
  marshalledSrc.free();
  return value;
}

interface NoderContextType {
  langLib: WebAssembly.Instance;
  wasmUtils: ReturnType<typeof makeWasmHelper>;
  sourceDefinesToNodeTypes(lib: WebAssembly.Instance, source: string): string;
}

const defaultContext: NoderContextType = {
  langLib,
  wasmUtils,
  sourceDefinesToNodeTypes,
};

export const NoderContext = React.createContext<NoderContextType>(defaultContext);

export const NoderProvider = (props: React.PropsWithChildren<{}>) => {
  return <NoderContext.Provider value={{
    ...defaultContext,
  }}>
    {props.children}
  </NoderContext.Provider>
};

