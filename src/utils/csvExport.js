/**
 * Neutralises spreadsheet formula injection (CWE-1236): a text cell that
 * begins with = + - @ or a tab / carriage return would be executed as a
 * formula by Excel / Sheets / LibreOffice. Prefixing a single quote makes it
 * plain text. Real numbers (typeof "number") are left untouched, so values
 * like -3 or 16 stay numeric.
 */
export function neutralizeFormula(value) {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Converts an array of flat objects into a CSV file and triggers a browser
 * download. `columns` controls column order and headers:
 * `[{ key: "name", label: "Name" }, ...]`. An optional `note` is written as
 * a plain first line before the header row (e.g. who exported the file).
 *
 * Every cell is formula-neutralised, then RFC 4180-quoted when it contains
 * a comma, quote, CR or LF. A UTF-8 BOM keeps Hindi/Russian text readable
 * when the file is opened in Excel.
 */
export function toCSV(rows, columns, note) {
  const escapeCell = (value) => {
    const safe = neutralizeFormula(value);
    const str = safe === null || safe === undefined ? "" : String(safe);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(",")).join("\n");
  return note ? `${escapeCell(note)}\n${header}\n${body}` : `${header}\n${body}`;
}

export function downloadCSV(filename, rows, columns, note) {
  const csv = toCSV(rows, columns, note);
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
