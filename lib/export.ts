"use client";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
} from "docx";

/**
 * Parse markdown content to extract table data and text sections
 */
function parseMarkdownContent(content: string) {
  const lines = content.split("\n");
  const tables: string[][][] = [];
  const textSections: string[] = [];
  let currentTable: string[][] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line is a table row (contains |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;

      const cells = trimmed
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());

      if (cells.length > 0) {
        inTable = true;
        currentTable.push(cells);
      }
    } else {
      if (inTable && currentTable.length > 0) {
        tables.push([...currentTable]);
        currentTable = [];
        inTable = false;
      }
      if (trimmed) {
        // Clean markdown formatting for text
        const cleaned = trimmed
          .replace(/^\#{1,6}\s+/, "") // Remove headings
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
          .replace(/\*(.*?)\*/g, "$1") // Remove italic
          .replace(/^[\-\*]\s+/, "• ") // Convert list markers
          .replace(/^\d+\.\s+/, (m) => m); // Keep numbered lists
        textSections.push(cleaned);
      }
    }
  }

  // Flush any remaining table
  if (currentTable.length > 0) {
    tables.push(currentTable);
  }

  return { tables, textSections };
}

/**
 * Export AI response as Excel (.xlsx)
 */
export function exportToExcel(content: string, filename = "browsey-export") {
  const { tables, textSections } = parseMarkdownContent(content);
  const wb = XLSX.utils.book_new();

  if (tables.length > 0) {
    // Each table becomes a sheet
    tables.forEach((table, i) => {
      const ws = XLSX.utils.aoa_to_sheet(table);

      // Auto-width columns
      const colWidths = table[0].map((_, colIdx) => ({
        wch: Math.max(
          ...table.map((row) => (row[colIdx] ? row[colIdx].length : 10)),
          12
        ),
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        tables.length === 1 ? "Data" : `Table ${i + 1}`
      );
    });
  } else {
    // No tables found — export text as rows
    const rows = textSections.map((line) => [line]);
    rows.unshift(["Browsey AI Export"]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, "Data");
  }

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export AI response as Word document (.docx)
 */
export async function exportToDocx(
  content: string,
  filename = "browsey-export"
) {
  const { tables, textSections } = parseMarkdownContent(content);
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: "Browsey AI Report",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleString()}`,
          italics: true,
          color: "888888",
          size: 20,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Add text sections
  for (const text of textSections) {
    if (text.startsWith("• ")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: text, size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: text, size: 22 })],
          spacing: { after: 150 },
        })
      );
    }
  }

  // Add tables
  for (const tableData of tables) {
    if (tableData.length === 0) continue;

    children.push(
      new Paragraph({ text: "", spacing: { before: 200, after: 100 } })
    );

    const tableRows = tableData.map(
      (row, rowIdx) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        bold: rowIdx === 0,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                width: {
                  size: Math.floor(9000 / row.length),
                  type: WidthType.DXA,
                },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                  },
                },
              })
          ),
        })
    );

    children.push(
      new Table({
        rows: tableRows,
        width: { size: 9000, type: WidthType.DXA },
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${filename}.docx`);
}
