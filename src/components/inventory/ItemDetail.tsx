"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, StickyNote } from "lucide-react";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/constants";
import { isLowStock } from "@/lib/items";
import { daysUntil, nextMaintDate } from "@/lib/maintenance";
import { formatDate, formatTHB } from "@/lib/utils";
import { updateItem } from "@/lib/items";
import type { InventoryItem } from "@/lib/types";

interface ItemDetailProps {
  item: InventoryItem;
}

export function ItemDetail({ item }: ItemDetailProps) {
  const [saving, setSaving] = useState(false);
  const statusMeta = STATUS_MAP[item.status];
  const categoryMeta = CATEGORY_MAP[item.category];
  const low = isLowStock(item);

  const next = nextMaintDate(item);
  const days = daysUntil(next);
  const maintTone =
    days === null ? null : days < 0 ? "overdue" : days <= 30 ? "soon" : "ok";

  async function markMaintainedToday() {
    setSaving(true);
    try {
      await updateItem(item.id, {
        maintLastDate: new Date().toISOString().slice(0, 10),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
        <p className="text-xs text-gray-400">
          {item.assetCode ?? "ไม่มีเลขครุภัณฑ์"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/15">
          {categoryMeta?.labelTh ?? item.category}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusMeta?.badgeClass ?? ""}`}
        >
          {statusMeta?.labelTh ?? item.status}
        </span>
        {low ? (
          <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
            ใกล้หมด
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            จำนวนคงเหลือ
          </dt>
          <dd className="font-medium text-gray-900">
            {item.quantity} {item.unit}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            จุดสั่งซื้อ
          </dt>
          <dd className="font-medium text-gray-900">
            {item.minQuantity} {item.unit}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            สถานที่
          </dt>
          <dd className="font-medium text-gray-900">{item.location ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            ผู้ดูแล
          </dt>
          <dd className="font-medium text-gray-900">{item.custodian ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            ราคาต่อชิ้น
          </dt>
          <dd className="font-medium text-gray-900">
            {item.unitPrice != null ? formatTHB(item.unitPrice) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            ราคารวม
          </dt>
          <dd className="font-medium text-gray-900">
            {item.unitPrice != null
              ? formatTHB(item.unitPrice * item.quantity)
              : "—"}
          </dd>
        </div>
        {categoryMeta?.tracksExpiry ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              วันหมดอายุ
            </dt>
            <dd className="font-medium text-gray-900">
              {formatDate(item.expiryDate)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            วันที่จัดซื้อ
          </dt>
          <dd className="font-medium text-gray-900">
            {formatDate(item.acquiredDate)}
          </dd>
        </div>
      </dl>

      {item.notes ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-sm ring-1 ring-inset ring-amber-600/15">
          <StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              หมายเหตุ
            </div>
            <p className="text-gray-700">{item.notes}</p>
          </div>
        </div>
      ) : null}

      {item.maintEnabled ? (
        <div
          className={`flex items-start gap-2.5 rounded-lg p-3 text-sm ring-1 ring-inset ${
            maintTone === "overdue"
              ? "bg-red-50 ring-red-600/15"
              : maintTone === "soon"
                ? "bg-amber-50 ring-amber-600/15"
                : "bg-gray-50 ring-gray-200"
          }`}
        >
          <CalendarClock
            className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
              maintTone === "overdue"
                ? "text-red-700"
                : maintTone === "soon"
                  ? "text-amber-700"
                  : "text-gray-500"
            }`}
          />
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              บำรุงรักษา / สอบเทียบ ทุก {item.maintIntervalMonths ?? 12} เดือน
            </div>
            <p className="text-gray-700">
              ล่าสุด {formatDate(item.maintLastDate)} · กำหนดถัดไป{" "}
              {formatDate(next)}
              {maintTone === "overdue" ? " (เลยกำหนดแล้ว)" : ""}
              {maintTone === "soon" ? " (ใกล้ถึงกำหนด)" : ""}
            </p>
            <button
              type="button"
              onClick={markMaintainedToday}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              บำรุงรักษาแล้ววันนี้
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
        สร้างเมื่อ {formatDate(item.createdAt)} · แก้ไขล่าสุด{" "}
        {formatDate(item.updatedAt)}
      </div>
    </div>
  );
}
