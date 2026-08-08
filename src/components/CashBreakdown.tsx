"use client";

import { Plus, Trash2 } from "lucide-react";
import { pkr, CashBreakdownItem } from "@/lib/calc";

export function CashBreakdown({
  items,
  onChange,
}: {
  items: CashBreakdownItem[];
  onChange: (items: CashBreakdownItem[]) => void;
}) {
  const total = items.reduce((a, i) => a + (Number(i.amount) || 0), 0);

  function update(i: number, field: "label" | "amount", value: string) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: field === "amount" ? Number(value) || 0 : value };
    onChange(next);
  }

  function addRow() {
    onChange([...items, { label: "", amount: 0 }]);
  }

  function removeRow(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="space-y-2 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder="e.g. Cash, JazzCash, Bank"
              value={item.label}
              onChange={(e) => update(i, "label", e.target.value)}
            />
            <input
              type="number"
              className="input w-28"
              placeholder="Amount"
              value={item.amount || ""}
              onChange={(e) => update(i, "amount", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-danger hover:bg-danger-soft"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-primary mb-3"
      >
        <Plus size={14} /> Add another
      </button>
      <div className="flex items-center justify-between bg-primary-soft rounded-lg px-3 py-2">
        <span className="text-[12.5px] font-medium text-primary">Total</span>
        <span className="font-mono font-bold text-primary text-[14px]">{pkr(total)}</span>
      </div>
    </div>
  );
}