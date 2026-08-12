"use client";

import { useMemo, useState } from "react";
import { Loader2, Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { createItem } from "@/lib/items";
import {
  IMPORT_FIELDS,
  buildImportRows,
  matchField,
  parseCsv,
  type ImportField,
  type ImportRow,
} from "@/lib/importCsv";
import type { InventoryItemInput } from "@/lib/types";

interface ImportWizardProps {
  onDone: () => void;
  onCancel: () => void;
}

const TEMPLATE_HEADERS = IMPORT_FIELDS.map((f) => f.label);
const TEMPLATE_SAMPLE = [
  "SCI-LAB-999",
  "ตัวอย่าง: กล้องจุลทรรศน์",
  "ครุภัณฑ์วิทยาศาสตร์",
  "ห้องแล็บ 2-201",
  "5",
  "2",
  "ชิ้น",
  "ใช้งานได้",
  "45000",
  "",
];

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE]
    .map((r) => r.map(csvEscape).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "เทมเพลตนำเข้าครุภัณฑ์.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportWizard({ onDone, onCancel }: ImportWizardProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportField["key"] | null>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; skipped: number } | null>(null);

  const rows: ImportRow[] = useMemo(
    () => buildImportRows(headerRow, dataRows, mapping),
    [headerRow, dataRows, mapping],
  );
  const validRows = rows.filter((r) => r.errors.length === 0);

  async function onFile(file: File) {
    setParseError(null);
    setResult(null);
    try {
      const text = await file.text();
      const table = parseCsv(text);
      if (table.length < 2) {
        setParseError("ไม่พบข้อมูลในไฟล์ (ต้องมีแถวหัวตารางและข้อมูลอย่างน้อย 1 แถว)");
        return;
      }
      const [header, ...data] = table;
      const autoMap: Record<number, ImportField["key"] | null> = {};
      header.forEach((h, i) => {
        autoMap[i] = matchField(h);
      });
      setFileName(file.name);
      setHeaderRow(header);
      setDataRows(data);
      setMapping(autoMap);
    } catch {
      setParseError("ไม่สามารถอ่านไฟล์นี้ได้ — ตรวจสอบว่าเป็นไฟล์ .csv ที่ถูกต้อง");
    }
  }

  async function commitImport() {
    setImporting(true);
    let ok = 0;
    for (const row of validRows) {
      try {
        await createItem(row.input as InventoryItemInput);
        ok += 1;
      } catch {
        // Leave it counted as skipped; the row-level error surfaces in the summary.
      }
    }
    setImporting(false);
    setResult({ ok, skipped: rows.length - ok });
    if (ok > 0) onDone();
  }

  if (!fileName) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            ยังไม่มีเทมเพลต? ดาวน์โหลดไฟล์ตัวอย่าง กรอกข้อมูล แล้วนำกลับมานำเข้าได้เลย
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            ดาวน์โหลดเทมเพลต
          </button>
        </div>

        {parseError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
        ) : null}

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40">
          <Upload className="h-8 w-8 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            คลิกเพื่อเลือกไฟล์ .csv
          </span>
          <span className="text-xs text-gray-400">
            ระบบจะช่วยจับคู่คอลัมน์ให้อัตโนมัติในขั้นถัดไป
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        ไฟล์: <span className="font-medium text-gray-900">{fileName}</span> ·{" "}
        {dataRows.length} แถว
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              {headerRow.map((h, colIdx) => (
                <th key={colIdx} className="px-3 py-2 text-left font-semibold text-gray-500">
                  <div className="mb-1 truncate" title={h}>
                    {h}
                  </div>
                  <select
                    value={mapping[colIdx] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [colIdx]: (e.target.value || null) as ImportField["key"] | null,
                      }))
                    }
                    className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs font-normal text-gray-700"
                  >
                    <option value="">— ไม่นำเข้า —</option>
                    {IMPORT_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
              <th className="px-3 py-2 text-left font-semibold text-gray-500">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dataRows.slice(0, 50).map((cells, i) => {
              const row = rows[i];
              return (
                <tr key={i} className={row.errors.length ? "bg-red-50/60" : undefined}>
                  {cells.map((cell, j) => (
                    <td key={j} className="max-w-[160px] truncate px-3 py-1.5 text-gray-600">
                      {cell}
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    {row.errors.length ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                        title={row.errors.join(", ")}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        ผิดพลาด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        พร้อมนำเข้า
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dataRows.length > 50 ? (
        <p className="text-xs text-gray-400">แสดง 50 แถวแรกจากทั้งหมด {dataRows.length} แถว</p>
      ) : null}

      <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 p-3 text-sm">
        <span>
          พร้อมนำเข้า: <b className="text-green-700">{validRows.length}</b>
        </span>
        <span>
          มีปัญหา: <b className="text-red-700">{rows.length - validRows.length}</b>
        </span>
      </div>

      {result ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          นำเข้าสำเร็จ {result.ok} รายการ
          {result.skipped ? ` · ข้าม ${result.skipped} รายการที่มีปัญหา` : ""}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => {
            setFileName(null);
            setHeaderRow([]);
            setDataRows([]);
            setResult(null);
          }}
          disabled={importing}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          เลือกไฟล์ใหม่
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={importing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={commitImport}
            disabled={importing || validRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            นำเข้า {validRows.length} รายการ
          </button>
        </div>
      </div>
    </div>
  );
}
