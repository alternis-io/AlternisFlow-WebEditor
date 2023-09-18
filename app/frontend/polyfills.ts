import type { CompressionStream, DecompressionStream } from "@stardazed/streams-compression";

// FIXME: use a dynamic import, most people won't need this
export async function getCompressionStreamImpl(): Promise<{
  CompressionStream: typeof CompressionStream,
  DecompressionStream: typeof DecompressionStream,
}> {
  if (!("CompressionStream" in globalThis)) {
    const impl = await import("@stardazed/streams-compression");
    return {
      CompressionStream: impl.CompressionStream,
      DecompressionStream: impl.DecompressionStream,
    };
  }

  return {
    CompressionStream: (globalThis as any).CompressionStream,
    DecompressionStream: (globalThis as any).DecompressionStream
  };
}

