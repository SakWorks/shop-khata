"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { pkr, fmtDateLabel, todayKey } from "@/lib/calc";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import { X } from "lucide-react";

type Item = {
  id: string;
  name: string;
  qty: number;
  cost: number;
  purchase_date: string;
  status: "pending" | "sold";
  sale_amount: number | null;
  sale_date: string | null;
};

export default function InventoryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayKey());
  const [saleInputs, setSaleInputs] = useState<Record<string, { amount: string; date: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    if (!name.trim() || !qty || !cost) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        user_id: user.id,
        name: name.trim(),
        qty: Number(qty),
        cost: Number(cost),
        purchase_date: date,
        status: "pending",
      })
      .select()
      .single();
    if (!error && data) {
      setItems([data, ...items]);
      setName(""); setQty(""); setCost("");
    }
  }

  async function markSold(item: Item) {
    const input = saleInputs[item.id];
    if (!input?.amount) return;
    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        status: "sold",
        sale_amount: Number(input.amount),
        sale_date: input.date || todayKey(),
      })
      .eq("id", item.id)
      .select()
      .single();
    if (!error && data) {
      setItems(items.map((i) => (i.id === item.id ? data : i)));
    }
  }

  async function deleteItem(id: string) {
    await supabase.from("inventory_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  const pending = items.filter((i) => i.status !== "sold");
  const sold = items.filter((i) => i.status === "sold");
  const totalInvested = items.reduce((a, i) => a + Number(i.cost), 0);
  const pendingValue = pending.reduce((a, i) => a + Number(i.cost), 0);
  const totalProfit = sold.reduce((a, i) => a + (Number(i.sale_amount || 0) - Number(i.cost)), 0);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Purchases, stock on hand, and profit once sold" />

      <SectionCard title="Add a purchase">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="label block mb-1.5">Item name</label>
            <input className="input" placeholder="e.g. Cooking oil cartons" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="label block mb-1.5">Quantity</label>
            <input type="number" className="input" placeholder="10" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="w-32">
            <label className="label block mb-1.5">Total cost (Rs)</label>
            <input type="number" className="input" placeholder="12000" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="label block mb-1.5">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={addItem}>Add</button>
        </div>
      </SectionCard>

      {loading ? (
        <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
      ) : (
        <>
          <SectionCard title="Pending stock" tag={`${pending.length} item(s)`}>
            {pending.length === 0 ? (
              <EmptyState text="No unsold stock right now." />
            ) : (
              pending.map((i) => (
                <div key={i.id} className="py-3 border-b border-dashed border-border last:border-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{i.name}</span>
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide bg-amber-soft text-amber px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <button className="btn-danger-ghost" onClick={() => deleteItem(i.id)}><X size={12} /></button>
                  </div>
                  <p className="text-xs text-ink-soft font-mono mt-1">
                    Qty {i.qty} · Bought {pkr(i.cost)} on {fmtDateLabel(i.purchase_date)}
                  </p>
                  <div className="flex flex-wrap gap-3 items-end mt-2.5">
                    <div className="w-32">
                      <label className="label block mb-1.5">Sale amount (Rs)</label>
                      <input
                        type="number"
                        className="input"
                        value={saleInputs[i.id]?.amount || ""}
                        onChange={(e) => setSaleInputs({ ...saleInputs, [i.id]: { amount: e.target.value, date: saleInputs[i.id]?.date || todayKey() } })}
                      />
                    </div>
                    <div className="w-36">
                      <label className="label block mb-1.5">Sale date</label>
                      <input
                        type="date"
                        className="input"
                        value={saleInputs[i.id]?.date || todayKey()}
                        onChange={(e) => setSaleInputs({ ...saleInputs, [i.id]: { amount: saleInputs[i.id]?.amount || "", date: e.target.value } })}
                      />
                    </div>
                    <button className="btn-primary" onClick={() => markSold(i)}>Mark sold</button>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard title="Sold & profit realised" tag={`${sold.length} item(s)`}>
            {sold.length === 0 ? (
              <EmptyState text="Nothing marked as sold yet." />
            ) : (
              sold.map((i) => {
                const profit = Number(i.sale_amount || 0) - Number(i.cost);
                return (
                  <div key={i.id} className="py-3 border-b border-dashed border-border last:border-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{i.name}</span>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wide bg-success-soft text-success px-2 py-0.5 rounded-full">Sold</span>
                      </div>
                      <button className="btn-danger-ghost" onClick={() => deleteItem(i.id)}><X size={12} /></button>
                    </div>
                    <p className="text-xs text-ink-soft font-mono mt-1">
                      Qty {i.qty} · Bought {pkr(i.cost)} on {fmtDateLabel(i.purchase_date)} → Sold {pkr(i.sale_amount || 0)} on {fmtDateLabel(i.sale_date || "")} · Profit{" "}
                      <span className={profit >= 0 ? "text-success font-semibold" : "text-danger font-semibold"}>{pkr(profit)}</span>
                    </p>
                  </div>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Inventory summary">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Total invested (all stock)</span><span className="font-mono">{pkr(totalInvested)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Value tied up in unsold stock</span><span className="font-mono">{pkr(pendingValue)}</span></div>
              <div className={`flex justify-between font-semibold pt-2 border-t border-border ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
                <span>Profit realised from sold stock</span><span className="font-mono">{pkr(totalProfit)}</span>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
