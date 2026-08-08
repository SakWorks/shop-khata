"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calcDay,
  pkr,
  todayKey,
  fmtDateLabel,
  sumBreakdown,
  ShopDay,
  ShopExpense,
  SavingsEntry,
  CashBreakdownItem,
} from "@/lib/calc";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/ui";
import { CashBreakdown } from "@/components/CashBreakdown";
import { TrendingUp, Wallet, Receipt, X, PiggyBank, Check } from "lucide-react";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const emptyRow = (): CashBreakdownItem[] => [{ label: "Cash", amount: 0 }];

export default function TodayPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<ShopDay | null>(null);
  const [expenses, setExpenses] = useState<ShopExpense[]>([]);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editingClose, setEditingClose] = useState(false);
  const [openBreakdown, setOpenBreakdown] = useState<CashBreakdownItem[]>(emptyRow());
  const [openTime, setOpenTime] = useState(nowTime());
  const [closeBreakdown, setCloseBreakdown] = useState<CashBreakdownItem[]>(emptyRow());
  const [closeTime, setCloseTime] = useState(nowTime());
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [savings, setSavings] = useState<SavingsEntry | null>(null);
  const [savingsPct, setSavingsPct] = useState(10);
  const [savingSavings, setSavingSavings] = useState(false);
  const [savedSavings, setSavedSavings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: dayRow } = await supabase
      .from("shop_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayKey())
      .maybeSingle();

    setDay(dayRow);
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
      .eq("date", todayKey())
      .maybeSingle();
    setSavings(savingsRow);
    if (savingsRow) setSavingsPct(Number(savingsRow.percentage));

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function startEditOpen() {
    setOpenBreakdown(
      day?.opening_breakdown && day.opening_breakdown.length
        ? day.opening_breakdown
        : [{ label: "Cash", amount: Number(day?.opening_amount || 0) }]
    );
    setOpenTime(day?.opening_time || nowTime());
    setEditingOpen(true);
  }

  function startEditClose() {
    setCloseBreakdown(
      day?.closing_breakdown && day.closing_breakdown.length
        ? day.closing_breakdown
        : [{ label: "Cash", amount: Number(day?.closing_amount || 0) }]
    );
    setCloseTime(day?.closing_time || nowTime());
    setEditingClose(true);
  }

  async function saveOpening() {
    const valid = openBreakdown.filter((i) => i.label.trim() && i.amount);
    const total = sumBreakdown(valid);
    if (!total) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("shop_days")
      .upsert(
        {
          user_id: user.id,
          date: todayKey(),
          opening_time: openTime,
          opening_amount: total,
          opening_breakdown: valid,
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();
    if (!error) {
      setDay(data);
      setEditingOpen(false);
    }
  }

  async function saveClosing() {
    const valid = closeBreakdown.filter((i) => i.label.trim() && i.amount);
    const total = sumBreakdown(valid);
    if (!total || !day) return;
    const { data, error } = await supabase
      .from("shop_days")
      .update({ closing_time: closeTime, closing_amount: total, closing_breakdown: valid })
      .eq("id", day.id)
      .select()
      .single();
    if (!error) {
      setDay(data);
      setEditingClose(false);
    }
  }

  async function addExpense() {
    if (!expDesc.trim() || !expAmt || !day) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("shop_expenses")
      .insert({
        user_id: user.id,
        day_id: day.id,
        description: expDesc.trim(),
        amount: Number(expAmt),
        time: nowTime(),
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses([...expenses, data]);
      setExpDesc("");
      setExpAmt("");
    }
  }

  async function deleteExpense(id: string) {
    await supabase.from("shop_expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  async function saveSavings(profitToday: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingSavings(true);
    setSavedSavings(false);
    const amount = Math.round((profitToday * savingsPct) / 100);
    const { data, error } = await supabase
      .from("savings_entries")
      .upsert(
        { user_id: user.id, date: todayKey(), profit: profitToday, percentage: savingsPct, amount },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();
    setSavingSavings(false);
    if (!error) {
      setSavings(data);
      setSavedSavings(true);
      setTimeout(() => setSavedSavings(false), 1800);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft py-10 text-center">Loading today&apos;s entry…</div>;
  }

  const calc = calcDay(day, expenses);

  return (
    <div>
      <PageHeader title="Today" subtitle={fmtDateLabel(todayKey())} />

      {(calc.hasOpening && calc.hasClosing) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <StatCard label="Gross Sales" value={pkr(calc.gross)} icon={TrendingUp} tone="primary" />
          <StatCard label="Expenses" value={pkr(calc.expenses)} icon={Receipt} tone="danger" />
          <StatCard
            label="Net Profit"
            value={pkr(calc.profit)}
            icon={Wallet}
            tone={calc.profit >= 0 ? "success" : "danger"}
          />
        </div>
      )}

      <SectionCard title="Opening cash">
        {calc.hasOpening && !editingOpen ? (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-1.5">
                Opened at <span className="font-medium">{day?.opening_time}</span>
              </p>
              {day?.opening_breakdown && day.opening_breakdown.length ? (
                <div className="space-y-0.5">
                  {day.opening_breakdown.map((item, i) => (
                    <p key={i} className="text-[13px] text-ink-soft">
                      {item.label}: <span className="font-mono text-ink">{pkr(item.amount)}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              <p className="text-sm font-semibold mt-1.5">
                Total: <span className="font-mono">{pkr(calc.opening)}</span>
              </p>
            </div>
            <button className="btn-secondary text-[12.5px] py-1.5 px-3" onClick={startEditOpen}>
              Edit
            </button>
          </div>
        ) : (
          <div>
            <div className="w-36 mb-3">
              <label className="label block mb-1.5">Time</label>
              <input type="time" className="input" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
            </div>
            <label className="label block mb-1.5">Cash in drawer, by type</label>
            <CashBreakdown items={openBreakdown} onChange={setOpenBreakdown} />
            <button className="btn-primary mt-3" onClick={saveOpening}>Save opening</button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Closing cash">
        {!calc.hasOpening ? (
          <p className="text-sm text-ink-soft">Enter today&apos;s opening amount first.</p>
        ) : calc.hasClosing && !editingClose ? (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-1.5">
                Closed at <span className="font-medium">{day?.closing_time}</span>
              </p>
              {day?.closing_breakdown && day.closing_breakdown.length ? (
                <div className="space-y-0.5">
                  {day.closing_breakdown.map((item, i) => (
                    <p key={i} className="text-[13px] text-ink-soft">
                      {item.label}: <span className="font-mono text-ink">{pkr(item.amount)}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              <p className="text-sm font-semibold mt-1.5">
                Total: <span className="font-mono">{pkr(calc.closing)}</span>
              </p>
            </div>
            <button className="btn-secondary text-[12.5px] py-1.5 px-3" onClick={startEditClose}>
              Edit
            </button>
          </div>
        ) : (
          <div>
            <div className="w-36 mb-3">
              <label className="label block mb-1.5">Time</label>
              <input type="time" className="input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
            <label className="label block mb-1.5">Cash in drawer, by type</label>
            <CashBreakdown items={closeBreakdown} onChange={setCloseBreakdown} />
            <button className="btn-primary mt-3" onClick={saveClosing}>Save closing</button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Shop expenses today" tag={pkr(calc.expenses)}>
        {!day ? (
          <EmptyState text="Enter today's opening amount first." />
        ) : (
          <>
            {expenses.length === 0 ? (
              <EmptyState text="No shop expenses logged yet — tea, food, small purchases, etc." />
            ) : (
              <div className="mb-4">
                {expenses.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between py-2 border-b border-dashed border-border last:border-none">
                    <div>
                      <span className="text-sm font-medium">{ex.description}</span>
                      <span className="text-xs text-ink-soft ml-2">{ex.time}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{pkr(ex.amount)}</span>
                      <button className="btn-danger-ghost" onClick={() => deleteExpense(ex.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="label block mb-1.5">What for</label>
                <input className="input" placeholder="e.g. Tea, lunch" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
              </div>
              <div className="w-32">
                <label className="label block mb-1.5">Amount (Rs)</label>
                <input type="number" className="input" placeholder="150" value={expAmt} onChange={(e) => setExpAmt(e.target.value)} />
              </div>
              <button className="btn-secondary" onClick={addExpense}>Add</button>
            </div>
          </>
        )}
      </SectionCard>

      {calc.hasOpening && calc.hasClosing && (
        <SectionCard title="Save from today's profit" tag={savings ? pkr(savings.amount) : undefined}>
          {calc.profit <= 0 ? (
            <p className="text-sm text-ink-soft">No profit today to save from.</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={savingsPct}
                  onChange={(e) => setSavingsPct(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <div className="flex items-center gap-1 w-24 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input text-center"
                    value={savingsPct}
                    onChange={(e) => setSavingsPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                  <span className="text-sm text-ink-soft">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-primary-soft rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center gap-2">
                  <PiggyBank size={16} className="text-primary" />
                  <span className="text-[13.5px] font-medium text-primary">
                    {savingsPct}% of {pkr(calc.profit)}
                  </span>
                </div>
                <span className="font-mono font-bold text-primary text-[15px]">
                  {pkr((calc.profit * savingsPct) / 100)}
                </span>
              </div>

              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => saveSavings(calc.profit)}
                disabled={savingSavings}
              >
                {savingSavings && <span className="animate-spin">⏳</span>}
                {savedSavings && <Check size={15} />}
                {savingSavings ? "Saving…" : savedSavings ? "Saved" : savings ? "Update saving" : "Save this amount"}
              </button>
              {savings && (
                <p className="text-[12px] text-ink-soft mt-2">
                  Currently saved today: <span className="font-mono font-medium text-ink">{pkr(savings.amount)}</span> ({Number(savings.percentage)}%)
                </p>
              )}
            </>
          )}
        </SectionCard>
      )}

      {calc.hasOpening && calc.hasClosing && (
        <SectionCard title="How this is calculated">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Closing − Opening</span><span className="font-mono">{pkr(calc.closing)} − {pkr(calc.opening)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">+ Shop expenses today</span><span className="font-mono">{pkr(calc.expenses)}</span></div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold"><span>Gross Sales (Revenue)</span><span className="font-mono">{pkr(calc.gross)}</span></div>
            <div className={`flex justify-between font-semibold ${calc.profit >= 0 ? "text-success" : "text-danger"}`}><span>Net Profit Today</span><span className="font-mono">{pkr(calc.profit)}</span></div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}