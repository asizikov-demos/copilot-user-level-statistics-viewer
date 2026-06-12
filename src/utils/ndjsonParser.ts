export interface NdjsonLine {
  line: string;
  lineNumber: number;
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
  const parts = text.split(/\r?\n/);
  const result: NdjsonLine[] = [];
  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (trimmed) {
      result.push({ line: trimmed, lineNumber: i + 1 });
    }
  }
  return result;
}
