"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { pkr, currentMonthKey, monthLabel } from "@/lib/calc";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import { X } from "lucide-react";

type MonthlyExpense = { id: string; month: string; rent: number };
type Bill = { id: string; description: string; amount: number };

export default function BillsPage() {
  const supabase = createClient();
  const [month, setMonth] = useState(currentMonthKey());
  const [monthly, setMonthly] = useState<MonthlyExpense | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [rentInput, setRentInput] = useState("");
  const [billDesc, setBillDesc] = useState("");
  const [billAmt, setBillAmt] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from("monthly_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();
    setMonthly(me);
    setRentInput(me?.rent ? String(me.rent) : "");

    const { data: b } = await supabase
      .from("monthly_bills")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .order("created_at", { ascending: true });
    setBills(b || []);
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("monthly_expenses")
      .upsert({ user_id: user.id, month, rent: Number(rentInput || 0) }, { onConflict: "user_id,month" })
      .select()
      .single();
    if (!error) setMonthly(data);
  }

  async function addBill() {
    if (!billDesc.trim() || !billAmt) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("monthly_bills")
      .insert({ user_id: user.id, month, description: billDesc.trim(), amount: Number(billAmt) })
      .select()
      .single();
    if (!error && data) {
      setBills([...bills, data]);
      setBillDesc("");
      setBillAmt("");
    }
  }

  async function deleteBill(id: string) {
    await supabase.from("monthly_bills").delete().eq("id", id);
    setBills(bills.filter((b) => b.id !== id));
  }

  const totalFixed = Number(monthly?.rent || 0) + bills.reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div>
      <PageHeader title="Monthly Bills" subtitle="Rent and recurring bills — separate from daily shop expenses" />

      <div className="max-w-[200px] mb-4">
        <label className="label block mb-1.5">Month</label>
        <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
      ) : (
        <>
          <SectionCard title="Rent">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="label block mb-1.5">Monthly rent — shop + house (Rs)</label>
                <input type="number" className="input" placeholder="e.g. 25000" value={rentInput} onChange={(e) => setRentInput(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={saveRent}>Save rent</button>
            </div>
          </SectionCard>

          <SectionCard title="Other bills" tag={`${bills.length} item(s)`}>
            {bills.length === 0 ? (
              <EmptyState text="No bills added for this month yet — electricity, gas, water, etc." />
            ) : (
              <div className="mb-4">
                {bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-dashed border-border last:border-none">
                    <span className="text-sm font-medium">{b.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{pkr(b.amount)}</span>
                      <button className="btn-danger-ghost" onClick={() => deleteBill(b.id)}><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="label block mb-1.5">Bill</label>
                <input className="input" placeholder="e.g. Electricity" value={billDesc} onChange={(e) => setBillDesc(e.target.value)} />
              </div>
              <div className="w-32">
                <label className="label block mb-1.5">Amount (Rs)</label>
                <input type="number" className="input" value={billAmt} onChange={(e) => setBillAmt(e.target.value)} />
              </div>
              <button className="btn-secondary" onClick={addBill}>Add</button>
            </div>
          </SectionCard>

          <SectionCard title={`Total fixed expenses — ${monthLabel(month)}`}>
            <div className="flex justify-between text-base font-bold">
              <span>Rent + Bills</span>
              <span className="font-mono">{pkr(totalFixed)}</span>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
