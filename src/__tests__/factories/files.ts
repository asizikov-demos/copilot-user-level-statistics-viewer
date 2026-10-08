const encoder = new TextEncoder();

function withStream(name: string, start: (controller: ReadableStreamDefaultController<Uint8Array>) => void): File {
  const file = new File([''], name, { type: 'application/x-ndjson' });
  Object.defineProperty(file, 'stream', {
    value: () => new ReadableStream<Uint8Array>({ start }),
  });
  return file;
}

/** NDJSON File whose stream() yields each string as a separate chunk. */
export function createChunkedFile(chunks: string[], name = 'metrics.ndjson'): File {
  const encodedChunks = chunks.map(chunk => encoder.encode(chunk));
  return withStream(name, controller => {
    for (const chunk of encodedChunks) {
      controller.enqueue(chunk);
    }
    controller.close();
  });
}

/** NDJSON File whose stream() errors immediately. */
export function createFailingFile(name: string, error: Error): File {
  return withStream(name, controller => controller.error(error));
}
