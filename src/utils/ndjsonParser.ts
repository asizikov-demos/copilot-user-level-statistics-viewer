export interface NdjsonLine {
  line: string;
  lineNumber: number;
}

export interface NdjsonChunkResult {
  lines: NdjsonLine[];
  remainder: string;
  nextLineNumber: number;
}

function toNdjsonLine(line: string, lineNumber: number): NdjsonLine | null {
  const trimmed = line.trim();
  return trimmed ? { line: trimmed, lineNumber } : null;
}

export function splitNdjsonChunk(
  chunk: string,
  remainder: string = '',
  startLineNumber: number = 1
): NdjsonChunkResult {
  const parts = `${remainder}${chunk}`.split(/\r?\n/);
  const lines: NdjsonLine[] = [];

  for (let i = 0; i < parts.length - 1; i++) {
    const ndjsonLine = toNdjsonLine(parts[i], startLineNumber + i);
    if (ndjsonLine) {
      lines.push(ndjsonLine);
    }
  }

  return {
    lines,
    remainder: parts.at(-1) ?? '',
    nextLineNumber: startLineNumber + Math.max(parts.length - 1, 0),
  };
}

export function flushNdjsonRemainder(remainder: string, lineNumber: number = 1): NdjsonLine[] {
  const ndjsonLine = toNdjsonLine(remainder, lineNumber);
  return ndjsonLine ? [ndjsonLine] : [];
}

/**
 * Splits NDJSON (or plain newline-delimited) text into trimmed, non-empty lines.
 *
 * Handles both LF (\n) and CRLF (\r\n) line endings. Each returned entry
 * carries the trimmed line string and its 1-based line number in the source
 * text. Files that do not end with a newline are handled correctly — the last
 * non-empty line is always included.
 *
 * JSON parsing and schema validation are intentionally left to the caller so
 * that this helper can be reused across different parsing contexts.
 */
export function splitNdjsonLines(text: string): NdjsonLine[] {
  const { lines, remainder, nextLineNumber } = splitNdjsonChunk(text);
  return [...lines, ...flushNdjsonRemainder(remainder, nextLineNumber)];
}
