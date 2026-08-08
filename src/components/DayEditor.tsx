"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcDay, pkr, fmtDateLabel, sumBreakdown, ShopDay, ShopExpense, SavingsEntry, CashBreakdownItem } from "@/lib/calc";
import { Modal, EmptyState } from "@/components/ui";
import { CashBreakdown } from "@/components/CashBreakdown";
import { Loader2, Check, Trash2, Plus, Receipt as ReceiptIcon, PiggyBank } from "lucide-react";

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
  const [savings, setSavings] = useState<SavingsEntry | null>(null);

  const [openTime, setOpenTime] = useState("");
  const [openBreakdown, setOpenBreakdown] = useState<CashBreakdownItem[]>([{ label: "Cash", amount: 0 }]);
  const [closeTime, setCloseTime] = useState("");
  const [closeBreakdown, setCloseBreakdown] = useState<CashBreakdownItem[]>([{ label: "Cash", amount: 0 }]);
  const [editingAmounts, setEditingAmounts] = useState(false);

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
    setOpenBreakdown(
      dayRow?.opening_breakdown && dayRow.opening_breakdown.length
        ? dayRow.opening_breakdown
        : [{ label: "Cash", amount: Number(dayRow?.opening_amount || 0) }]
    );
    setCloseTime(dayRow?.closing_time || "");
    setCloseBreakdown(
      dayRow?.closing_breakdown && dayRow.closing_breakdown.length
        ? dayRow.closing_breakdown
        : [{ label: "Cash", amount: Number(dayRow?.closing_amount || 0) }]
    );

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

    const { data: savingsRow } = await supabase
      .from("savings_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateKey)
      .maybeSingle();
    setSavings(savingsRow);

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

    const validOpen = openBreakdown.filter((i) => i.label.trim() && i.amount);
    const validClose = closeBreakdown.filter((i) => i.label.trim() && i.amount);

    const payload: Record<string, unknown> = { user_id: user.id, date: dateKey };
    if (validOpen.length) {
      payload.opening_amount = sumBreakdown(validOpen);
      payload.opening_time = openTime || null;
      payload.opening_breakdown = validOpen;
    }
    if (validClose.length) {
      payload.closing_amount = sumBreakdown(validClose);
      payload.closing_time = closeTime || null;
      payload.closing_breakdown = validClose;
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
      setEditingAmounts(false);
      onSaved();
      setTimeout(() => setSavedDay(false), 1800);
    }
  }

  async function addExpense() {
    if (!expDesc.trim() || !expAmt) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    <Modal title={fmtDateLabel(dateKey)} subtitle="Daily receipt — tap Edit to change anything" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-ink-soft py-8 text-center">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Receipt */}
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-4 font-mono text-[12.5px]">
            <div className="flex items-center gap-1.5 mb-3 text-ink-soft">
              <ReceiptIcon size={13} />
              <span className="uppercase tracking-wide text-[10.5px] font-semibold">Daily Receipt</span>
            </div>

            {day?.opening_breakdown && day.opening_breakdown.length > 0 && (
              <div className="mb-2.5">
                <p className="text-ink-soft mb-1">Opening ({day.opening_time || "—"})</p>
                {day.opening_breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>{pkr(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t border-dashed border-border mt-1 pt-1">
                  <span>Subtotal</span>
                  <span>{pkr(calc.opening)}</span>
                </div>
              </div>
            )}

            {day?.closing_breakdown && day.closing_breakdown.length > 0 && (
              <div className="mb-2.5">
                <p className="text-ink-soft mb-1">Closing ({day.closing_time || "—"})</p>
                {day.closing_breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>{pkr(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t border-dashed border-border mt-1 pt-1">
                  <span>Subtotal</span>
                  <span>{pkr(calc.closing)}</span>
                </div>
              </div>
            )}

            {expenses.length > 0 && (
              <div className="mb-2.5">
                <p className="text-ink-soft mb-1">Expenses</p>
                {expenses.map((ex) => (
                  <div key={ex.id} className="flex justify-between">
                    <span>{ex.description}</span>
                    <span>{pkr(ex.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {calc.hasOpening && calc.hasClosing && (
              <div className="border-t border-dashed border-ink mt-2 pt-2 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Gross Sales</span>
                  <span>{pkr(calc.gross)}</span>
                </div>
                <div className={`flex justify-between font-bold ${calc.profit >= 0 ? "text-success" : "text-danger"}`}>
                  <span>Net Profit</span>
                  <span>{pkr(calc.profit)}</span>
                </div>
                {savings && (
                  <div className="flex justify-between text-primary font-semibold pt-1">
                    <span className="flex items-center gap-1"><PiggyBank size={12} /> Saved ({Number(savings.percentage)}%)</span>
                    <span>{pkr(savings.amount)}</span>
                  </div>
                )}
              </div>
            )}

            {!day && <EmptyState text="No entries recorded for this day yet." />}
          </div>

          {/* Editable amounts */}
          {editingAmounts ? (
            <div>
              <p className="text-[13px] font-semibold mb-2">Opening time</p>
              <input type="time" className="input w-36 mb-2.5" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              <CashBreakdown items={openBreakdown} onChange={setOpenBreakdown} />

              <p className="text-[13px] font-semibold mb-2 mt-4">Closing time</p>
              <input type="time" className="input w-36 mb-2.5" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
              <CashBreakdown items={closeBreakdown} onChange={setCloseBreakdown} />

              <button className="btn-primary flex items-center gap-2 text-[13px] mt-3" onClick={saveDay} disabled={savingDay}>
                {savingDay && <Loader2 size={14} className="animate-spin" />}
                {savedDay && <Check size={14} />}
                {savingDay ? "Saving…" : savedDay ? "Saved" : "Save amounts"}
              </button>
            </div>
          ) : (
            <button className="btn-secondary text-[12.5px] py-1.5 px-3" onClick={() => setEditingAmounts(true)}>
              Edit opening / closing amounts
            </button>
          )}

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