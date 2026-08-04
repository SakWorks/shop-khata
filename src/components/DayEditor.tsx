"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcDay, pkr, fmtDateLabel, ShopDay, ShopExpense } from "@/lib/calc";
import { Modal, EmptyState } from "@/components/ui";
import { Loader2, Check, Trash2, Plus } from "lucide-react";

export function DayEditor({
  dateKey,
  onClose,
  onSaved,
}: {
  dateKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<ShopDay | null>(null);
  const [expenses, setExpenses] = useState<ShopExpense[]>([]);

  const [openTime, setOpenTime] = useState("");
  const [openAmt, setOpenAmt] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [closeAmt, setCloseAmt] = useState("");

  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");

  const [savingDay, setSavingDay] = useState(false);
  const [savedDay, setSavedDay] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: dayRow } = await supabase
      .from("shop_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateKey)
      .maybeSingle();

    setDay(dayRow);
    setOpenTime(dayRow?.opening_time || "");
    setOpenAmt(dayRow?.opening_amount != null ? String(dayRow.opening_amount) : "");
    setCloseTime(dayRow?.closing_time || "");
    setCloseAmt(dayRow?.closing_amount != null ? String(dayRow.closing_amount) : "");

    if (dayRow) {
      const { data: exp } = await supabase
        .from("shop_expenses")
        .select("*")
        .eq("day_id", dayRow.id)
        .order("time", { ascending: true });
      setExpenses(exp || []);
    } else {
      setExpenses([]);
    }
    setLoading(false);
  }, [supabase, dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveDay() {
    setSavingDay(true);
    setSavedDay(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = { user_id: user.id, date: dateKey };
    if (openAmt !== "") {
      payload.opening_amount = Number(openAmt);
      payload.opening_time = openTime || null;
    }
    if (closeAmt !== "") {
      payload.closing_amount = Number(closeAmt);
      payload.closing_time = closeTime || null;
    }

    const { data, error } = await supabase
      .from("shop_days")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();

    setSavingDay(false);
    if (!error) {
      setDay(data);
      setSavedDay(true);
      onSaved();
      setTimeout(() => setSavedDay(false), 1800);
    }
  }

  async function addExpense() {
    if (!expDesc.trim() || !expAmt) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If there's no day row yet, create a bare one first so the expense has somewhere to attach.
    let dayRow: ShopDay | null = day;
    if (!dayRow) {
      const { data, error } = await supabase
        .from("shop_days")
        .upsert({ user_id: user.id, date: dateKey }, { onConflict: "user_id,date" })
        .select()
        .single();
      if (error || !data) return;
      dayRow = data as ShopDay;
      setDay(dayRow);
    }
    const activeDay: ShopDay = dayRow;

    const { data, error } = await supabase
      .from("shop_expenses")
      .insert({
        user_id: user.id,
        day_id: activeDay.id,
        description: expDesc.trim(),
        amount: Number(expAmt),
        time: null,
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [...prev, data]);
      setExpDesc("");
      setExpAmt("");
      onSaved();
    }
  }

  async function updateExpense(id: string, field: "description" | "amount", value: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === "amount" ? Number(value) : value } : e))
    );
  }

  async function commitExpense(exp: ShopExpense) {
    await supabase
      .from("shop_expenses")
      .update({ description: exp.description, amount: exp.amount })
      .eq("id", exp.id);
    onSaved();
  }

  async function deleteExpense(id: string) {
    await supabase.from("shop_expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    onSaved();
  }

  const calc = calcDay(day, expenses);

  return (
    <Modal title={fmtDateLabel(dateKey)} subtitle="Edit this day's amounts and expenses" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-ink-soft py-8 text-center">Loading…</p>
      ) : (
        <div className="space-y-5">
          {calc.hasOpening && calc.hasClosing && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-background px-3 py-2.5">
                <p className="text-[10.5px] uppercase tracking-wide text-ink-soft mb-0.5">Gross</p>
                <p className="font-mono font-semibold text-[13px]">{pkr(calc.gross)}</p>
              </div>
              <div className="rounded-lg bg-background px-3 py-2.5">
                <p className="text-[10.5px] uppercase tracking-wide text-ink-soft mb-0.5">Expenses</p>
                <p className="font-mono font-semibold text-[13px]">{pkr(calc.expenses)}</p>
              </div>
              <div className={`rounded-lg px-3 py-2.5 ${calc.profit >= 0 ? "bg-success-soft" : "bg-danger-soft"}`}>
                <p className="text-[10.5px] uppercase tracking-wide text-ink-soft mb-0.5">Profit</p>
                <p className={`font-mono font-semibold text-[13px] ${calc.profit >= 0 ? "text-success" : "text-danger"}`}>
                  {pkr(calc.profit)}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[13px] font-semibold mb-2.5">Opening & closing cash</p>
            <div className="grid grid-cols-2 gap-3 mb-2.5">
              <div>
                <label className="label block mb-1.5">Opening time</label>
                <input type="time" className="input" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-1.5">Opening amount (Rs)</label>
                <input type="number" className="input" value={openAmt} onChange={(e) => setOpenAmt(e.target.value)} placeholder="e.g. 2000" />
              </div>
              <div>
                <label className="label block mb-1.5">Closing time</label>
                <input type="time" className="input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-1.5">Closing amount (Rs)</label>
                <input type="number" className="input" value={closeAmt} onChange={(e) => setCloseAmt(e.target.value)} placeholder="e.g. 5400" />
              </div>
            </div>
            <button className="btn-primary flex items-center gap-2 text-[13px]" onClick={saveDay} disabled={savingDay}>
              {savingDay && <Loader2 size={14} className="animate-spin" />}
              {savedDay && <Check size={14} />}
              {savingDay ? "Saving…" : savedDay ? "Saved" : "Save amounts"}
            </button>
          </div>

          <div>
            <p className="text-[13px] font-semibold mb-2.5">
              Expenses{expenses.length > 0 && <span className="text-ink-soft font-normal"> · {pkr(calc.expenses)}</span>}
            </p>

            {expenses.length === 0 ? (
              <EmptyState text="No expenses logged for this day." />
            ) : (
              <div className="space-y-2 mb-3">
                {expenses.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-[13px]"
                      value={ex.description}
                      onChange={(e) => updateExpense(ex.id, "description", e.target.value)}
                      onBlur={() => commitExpense(ex)}
                    />
                    <input
                      type="number"
                      className="input w-24 text-[13px]"
                      value={ex.amount}
                      onChange={(e) => updateExpense(ex.id, "amount", e.target.value)}
                      onBlur={() => commitExpense(ex)}
                    />
                    <button
                      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-danger hover:bg-danger-soft"
                      onClick={() => deleteExpense(ex.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                className="input flex-1 text-[13px]"
                placeholder="What for"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
              />
              <input
                type="number"
                className="input w-24 text-[13px]"
                placeholder="Amount"
                value={expAmt}
                onChange={(e) => setExpAmt(e.target.value)}
              />
              <button
                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-primary text-white hover:bg-primary/90"
                onClick={addExpense}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}