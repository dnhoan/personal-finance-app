import "server-only";
import { csvEscapeCell } from "@/lib/csv-escape";

// UTF-8 BOM. Excel needs it to read the file as UTF-8 rather than the locale ANSI
// codepage, otherwise Vietnamese diacritics render as mojibake (đ, ư, ơ, …).
const BOM = "﻿";

const encoder = new TextEncoder();

export type CsvColumn<T> = {
  header: string;
  /** Returns the raw cell value; escaping/quoting is applied by the builder. */
  value: (row: T) => unknown;
};

/**
 * Builds a streaming CSV `Response` body from an async row source. Emits the BOM,
 * the header row, then data rows in chunks of `chunkRows` so memory stays flat for
 * large exports. Every cell — header and data — passes through `csvEscapeCell`
 * (RFC-4180 quoting + formula-injection neutralisation).
 */
export function csvStream<T>(
  rows: AsyncIterable<T> | Iterable<T>,
  columns: CsvColumn<T>[],
  chunkRows = 200,
): ReadableStream<Uint8Array> {
  const headerLine = columns.map((c) => csvEscapeCell(c.header)).join(",") + "\r\n";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(BOM + headerLine));

      let buffer = "";
      let count = 0;
      for await (const row of rows as AsyncIterable<T>) {
        buffer += columns.map((c) => csvEscapeCell(c.value(row))).join(",") + "\r\n";
        count += 1;
        if (count % chunkRows === 0) {
          controller.enqueue(encoder.encode(buffer));
          buffer = "";
        }
      }
      if (buffer) controller.enqueue(encoder.encode(buffer));
      controller.close();
    },
  });
}
