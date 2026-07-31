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
    remainder: parts[parts.length - 1] ?? '',
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

export interface NdjsonParsedRecord {
  value: unknown;
  lineNumber: number;
}

/**
 * Parses all non-empty lines in NDJSON text as JSON, skipping any line that
 * fails to parse. Calls `onInvalidLine` (if provided) with the 1-based line
 * number and error message for each skipped line so callers can emit their own
 * diagnostic.
 *
 * Use this for lenient contexts where a single malformed record should not
 * abort the whole file (e.g. model-inventory scans).
 */
export function parseNdjsonRecordsLenient(
  text: string,
  onInvalidLine?: (lineNumber: number, message: string) => void
): NdjsonParsedRecord[] {
  const records: NdjsonParsedRecord[] = [];
  for (const { line, lineNumber } of splitNdjsonLines(text)) {
    try {
      records.push({ value: JSON.parse(line) as unknown, lineNumber });
    } catch (e) {
      onInvalidLine?.(lineNumber, e instanceof Error ? e.message : String(e));
    }
  }
  return records;
}

/**
 * Parses all non-empty lines in NDJSON text as JSON, throwing on the first
 * line that fails to parse. The thrown error includes the 1-based line number
 * so callers get an actionable diagnostic.
 *
 * Use this for strict contexts where any malformed input should be treated as
 * a fatal error (e.g. anonymization pipelines).
 */
export function parseNdjsonRecordsStrict(text: string): NdjsonParsedRecord[] {
  const records: NdjsonParsedRecord[] = [];
  for (const { line, lineNumber } of splitNdjsonLines(text)) {
    try {
      records.push({ value: JSON.parse(line) as unknown, lineNumber });
    } catch (e) {
      throw new Error(
        `Invalid JSON on line ${lineNumber}: ${e instanceof Error ? e.message : String(e)}`,
        { cause: e }
      );
    }
  }
  return records;
}
