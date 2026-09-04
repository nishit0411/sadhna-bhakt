/**
 * Converts an array of flat objects into a CSV file and triggers a browser
 * download. `columns` controls column order and headers:
 * `[{ key: "name", label: "Name" }, ...]`. An optional `note` is written as
 * a plain first line before the header row (e.g. who exported the file).
 */
export function downloadCSV(filename, rows, columns, note) {
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(",")).join("\n");
  const csv = note ? `${escapeCell(note)}\n${header}\n${body}` : `${header}\n${body}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
