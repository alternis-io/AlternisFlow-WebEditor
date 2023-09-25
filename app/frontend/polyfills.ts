import type { CompressionStream, DecompressionStream } from "@stardazed/streams-compression";

export async function getCompressionStreamImpl(): Promise<{
  CompressionStream: typeof CompressionStream,
  DecompressionStream: typeof DecompressionStream,
}> {
  if (!("CompressionStream" in globalThis)) {
    const impl = await import("@stardazed/streams-compression");
    Object.assign(globalThis, impl);
  }

  return {
    CompressionStream: (globalThis as any).CompressionStream,
    DecompressionStream: (globalThis as any).DecompressionStream
  };
}

