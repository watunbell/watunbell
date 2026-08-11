"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CATEGORIES, CATEGORY_MAP, STATUSES } from "@/lib/constants";
import type {
  Category,
  InventoryItem,
  InventoryItemInput,
  ItemStatus,
} from "@/lib/types";
import { createItem, updateItem } from "@/lib/items";
import { stripUndefined, toDateInputValue } from "@/lib/utils";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";

interface ItemFormProps {
  /** When provided, the form edits this item; otherwise it creates a new one. */
  item?: InventoryItem;
  onDone: () => void;
  onCancel: () => void;
}

export function ItemForm({ item, onDone, onCancel }: ItemFormProps) {
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [assetCode, setAssetCode] = useState(item?.assetCode ?? "");
  const [category, setCategory] = useState<Category>(
    item?.category ?? "lab_equipment",
  );
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "available");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [unit, setUnit] = useState(item?.unit ?? "unit");
  const [minQuantity, setMinQuantity] = useState(String(item?.minQuantity ?? 0));
  const [location, setLocation] = useState(item?.location ?? "");
  const [custodian, setCustodian] = useState(item?.custodian ?? "");
  const [expiryDate, setExpiryDate] = useState(toDateInputValue(item?.expiryDate));
  const [acquiredDate, setAcquiredDate] = useState(
    toDateInputValue(item?.acquiredDate),
  );
  const [unitPrice, setUnitPrice] = useState(
    item?.unitPrice != null ? String(item.unitPrice) : "",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracksExpiry = useMemo(
    () => CATEGORY_MAP[category]?.tracksExpiry ?? false,
    [category],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const qty = Number(quantity);
    const minQty = Number(minQuantity);
    if (Number.isNaN(qty) || qty < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }
    if (Number.isNaN(minQty) || minQty < 0) {
      setError("Minimum quantity must be a non-negative number.");
      return;
    }

    const payload: InventoryItemInput = stripUndefined({
      name: name.trim(),
      assetCode: assetCode.trim() || undefined,
      category,
      status,
      quantity: qty,
      unit: unit.trim() || "unit",
      minQuantity: minQty,
      location: location.trim() || undefined,
      custodian: custodian.trim() || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      unitPrice: unitPrice.trim() ? Number(unitPrice) : undefined,
      // Dates are stored as YYYY-MM-DD strings; null clears the value.
      expiryDate: tracksExpiry && expiryDate ? expiryDate : null,
      acquiredDate: acquiredDate ? acquiredDate : null,
    });

    setSaving(true);
    try {
      if (item) {
        await updateItem(item.id, payload);
      } else {
        await createItem(payload);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name" required>
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Compound Microscope (Olympus CX23)"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="assetCode">Asset code (รหัสครุภัณฑ์)</Label>
          <Input
            id="assetCode"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            placeholder="SCI-LAB-001"
          />
        </div>

        <div>
          <Label htmlFor="category" required>
            Category
          </Label>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} · {c.labelTh}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="quantity" required>
            Quantity
          </Label>
          <Input
            id="quantity"
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="unit" required>
            Unit
          </Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="unit / box / bottle / ml"
          />
        </div>

        <div>
          <Label htmlFor="minQuantity" required>
            Min. quantity (low-stock threshold)
          </Label>
          <Input
            id="minQuantity"
            type="number"
            min={0}
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status" required>
            Status
          </Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ItemStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room / cabinet / shelf"
          />
        </div>

        <div>
          <Label htmlFor="custodian">Custodian (ผู้ดูแล)</Label>
          <Input
            id="custodian"
            value={custodian}
            onChange={(e) => setCustodian(e.target.value)}
          />
        </div>

        {tracksExpiry ? (
          <div>
            <Label htmlFor="expiryDate">Expiry date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="acquiredDate">Acquired date</Label>
          <Input
            id="acquiredDate"
            type="date"
            value={acquiredDate}
            onChange={(e) => setAcquiredDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="unitPrice">Unit price (THB)</Label>
          <Input
            id="unitPrice"
            type="number"
            min={0}
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create item"}
        </button>
      </div>
    </form>
  );
}
