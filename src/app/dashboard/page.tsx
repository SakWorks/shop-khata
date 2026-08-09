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
import { PageHeader, SectionCard, StatCard, EmptyState, Modal } from "@/components/ui";
import { CashBreakdown } from "@/components/CashBreakdown";
import { Wallet, Receipt, X, PiggyBank, Check, Percent, ChevronRight, Receipt as ReceiptIcon, TrendingDown, TrendingUp, Minus, Equal } from "lucide-react";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const presetRows = (): CashBreakdownItem[] => [
  { label: "Cash", amount: 0 },
  { label: "JazzCash", amount: 0 },
  { label: "EasyPaisa", amount: 0 },
  { label: "Bank Account", amount: 0 },
];

/** Consistent color per payment type across Opening/Closing breakdown rows. */
function paymentColor(label: string): string {
  const key = label.trim().toLowerCase();
  if (key === "cash") return "text-purple-600";
  if (key === "jazzcash") return "text-orange-600";
  if (key === "easypaisa") return "text-green-600";
  if (key === "bank account") return "text-blue-600";
  return "text-ink-soft";
}

/**
 * Always shows the four permanent rows (Cash, JazzCash, EasyPaisa, Bank
 * Account) first — filling in saved amounts where they exist — then appends
 * any extra custom rows the user added on top of the presets.
 */
function withPresets(saved?: CashBreakdownItem[] | null): CashBreakdownItem[] {
  const presets = presetRows();
  const savedList = saved && saved.length ? saved : [];

  const merged = presets.map((preset) => {
    const match = savedList.find(
      (s) => s.label.trim().toLowerCase() === preset.label.toLowerCase()
    );
    return match ? { label: preset.label, amount: match.amount } : preset;
  });

  const extras = savedList.filter(
    (s) => !presets.some((p) => p.label.toLowerCase() === s.label.trim().toLowerCase())
  );

  return [...merged, ...extras];
}

/** A single animated line in the receipt — fades/slides in with a stagger delay. */
function ReceiptRow({
  index,
  mounted,
  icon: Icon,
  label,
  value,
  tone = "default",
  strong = false,
}: {
  index: number;
  mounted: boolean;
  icon?: React.ElementType;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "primary";
  strong?: boolean;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "primary" ? "text-primary" : "text-ink";
  return (
    <div
      style={{ transitionDelay: mounted ? `${index * 70}ms` : "0ms" }}
      className={`flex items-center justify-between transition-all duration-500 ease-out ${
        mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
      }`}
    >
      <span className="flex items-center gap-1.5 text-ink-soft">
        {Icon && <Icon size={12.5} className="shrink-0" />}
        {label}
      </span>
      <span className={`font-mono ${strong ? "font-bold text-[14px]" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}

export default function TodayPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<ShopDay | null>(null);
  const [expenses, setExpenses] = useState<ShopExpense[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openBreakdown, setOpenBreakdown] = useState<CashBreakdownItem[]>(presetRows());
  const [openTime, setOpenTime] = useState(nowTime());
  const [closeBreakdown, setCloseBreakdown] = useState<CashBreakdownItem[]>(presetRows());
  const [closeTime, setCloseTime] = useState(nowTime());
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [savings, setSavings] = useState<SavingsEntry | null>(null);
  const [savingsPct, setSavingsPct] = useState(10);
  const [savingSavings, setSavingSavings] = useState(false);
  const [savedSavings, setSavedSavings] = useState(false);
  const [receiptMounted, setReceiptMounted] = useState(false);

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
    setOpenBreakdown(withPresets(day?.opening_breakdown));
    setOpenTime(day?.opening_time || nowTime());
    setOpenModal(true);
  }

  function startEditClose() {
    setCloseBreakdown(withPresets(day?.closing_breakdown));
    setCloseTime(day?.closing_time || nowTime());
    setCloseModal(true);
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
      setOpenModal(false);
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
      setCloseModal(false);
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

  const calc = calcDay(day, expenses);

  // --- Receipt math ---
  // Step 1: take today's expenses out of the opening cash first.
  const adjustedOpening = calc.opening - calc.expenses;
  // Step 2: Net Amount = Closing − Adjusted Opening.
  const netAmount = calc.hasOpening && calc.hasClosing ? calc.closing - adjustedOpening : 0;
  const fivePct = netAmount * 0.05;
  const fifteenPct = netAmount * 0.15;
  const netCash = netAmount - fivePct - fifteenPct;

  // Trigger the receipt's entrance animation once its numbers are ready.
  useEffect(() => {
    if (calc.hasOpening && calc.hasClosing) {
      setReceiptMounted(false);
      const t = setTimeout(() => setReceiptMounted(true), 30);
      return () => clearTimeout(t);
    }
    setReceiptMounted(false);
  }, [calc.hasOpening, calc.hasClosing, calc.opening, calc.closing, calc.expenses]);

  if (loading) {
    return <div className="text-sm text-ink-soft py-10 text-center">Loading today&apos;s entry…</div>;
  }

  return (
    <div>
      <PageHeader title="Today" subtitle={fmtDateLabel(todayKey())} />

      {calc.hasOpening && calc.hasClosing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Net Cash" value={pkr(netCash)} icon={Wallet} tone="success" />
          <StatCard label="Expenses" value={pkr(calc.expenses)} icon={Receipt} tone="danger" />
          <StatCard label="5% of Net Amount" value={pkr(fivePct)} icon={Percent} tone="default" />
          <StatCard label="15% of Net Amount" value={pkr(fifteenPct)} icon={Percent} tone="primary" />
        </div>
      )}

      {/* Opening */}
      <button
        onClick={startEditOpen}
        className="w-full text-left card p-5 mb-4 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14.5px] font-semibold mb-1">Opening</h3>
            {calc.hasOpening ? (
              <>
                <p className="text-[13px] text-ink-soft mb-1">Opened at {day?.opening_time}</p>
                {(day?.opening_breakdown || [])
                  .filter((i) => i.amount > 0)
                  .map((i) => (
                    <div key={i.label} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className={`font-medium ${paymentColor(i.label)}`}>{i.label}</span>
                      <span className={`font-mono ${paymentColor(i.label)}`}>{pkr(i.amount)}</span>
                    </div>
                  ))}
                <p className="font-mono font-bold text-[15px] mt-1.5">{pkr(calc.opening)}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-soft">Tap to add today&apos;s opening cash</p>
            )}
          </div>
          <ChevronRight size={18} className="text-ink-soft shrink-0" />
        </div>
      </button>

      {/* Closing */}
      <button
        onClick={calc.hasOpening ? startEditClose : undefined}
        disabled={!calc.hasOpening}
        className="w-full text-left card p-5 mb-4 hover:border-primary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14.5px] font-semibold mb-1">Closing</h3>
            {!calc.hasOpening ? (
              <p className="text-[13px] text-ink-soft">Enter today&apos;s opening amount first.</p>
            ) : calc.hasClosing ? (
              <>
                <p className="text-[13px] text-ink-soft mb-1">Closed at {day?.closing_time}</p>
                {(day?.closing_breakdown || [])
                  .filter((i) => i.amount > 0)
                  .map((i) => (
                    <div key={i.label} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className={`font-medium ${paymentColor(i.label)}`}>{i.label}</span>
                      <span className={`font-mono ${paymentColor(i.label)}`}>{pkr(i.amount)}</span>
                    </div>
                  ))}
                <p className="font-mono font-bold text-[15px] mt-1.5">{pkr(calc.closing)}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-soft">Tap to add today&apos;s closing cash</p>
            )}
          </div>
          {calc.hasOpening && <ChevronRight size={18} className="text-ink-soft shrink-0" />}
        </div>
      </button>

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
          {netAmount <= 0 ? (
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
                    {savingsPct}% of {pkr(netAmount)}
                  </span>
                </div>
                <span className="font-mono font-bold text-primary text-[15px]">
                  {pkr((netAmount * savingsPct) / 100)}
                </span>
              </div>

              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => saveSavings(netAmount)}
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
        <div
          className={`relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm px-5 py-6 sm:px-7 sm:py-7 font-mono text-[13px] transition-all duration-700 ease-out ${
            receiptMounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.98]"
          }`}
        >
          {/* decorative glow */}
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--primary-soft), transparent)" }}
          />

          <div className="relative flex items-center gap-1.5 mb-5 text-ink-soft">
            <ReceiptIcon size={14} />
            <span className="uppercase tracking-wide text-[10.5px] font-semibold">Today&apos;s Receipt</span>
          </div>

          <div className="relative space-y-2">
            <ReceiptRow index={0} mounted={receiptMounted} icon={TrendingUp} label="Opening Amount" value={pkr(calc.opening)} />
            <ReceiptRow index={1} mounted={receiptMounted} icon={Minus} label="Expenses" value={pkr(calc.expenses)} tone="danger" />
          </div>

          <div className="relative border-t border-dashed border-border my-3 pt-2.5">
            <ReceiptRow index={2} mounted={receiptMounted} icon={Equal} label="Adjusted Opening" value={pkr(adjustedOpening)} strong />
          </div>

          <div className="relative space-y-2 mt-2">
            <ReceiptRow index={3} mounted={receiptMounted} icon={TrendingDown} label="Closing Amount" value={pkr(calc.closing)} />
            <ReceiptRow index={4} mounted={receiptMounted} icon={Minus} label="Adjusted Opening" value={pkr(adjustedOpening)} />
          </div>

          <div className="relative border-t border-dashed border-ink my-3 pt-2.5">
            <ReceiptRow index={5} mounted={receiptMounted} label="Net Amount" value={pkr(netAmount)} strong />
          </div>

          <div className="relative space-y-2 mt-1">
            <ReceiptRow index={6} mounted={receiptMounted} label="5% of Net Amount" value={pkr(fivePct)} />
            <ReceiptRow index={7} mounted={receiptMounted} label="15% of Net Amount" value={pkr(fifteenPct)} />
          </div>

          <div className="relative border-t-2 border-ink mt-4 pt-4">
            <div
              style={{ transitionDelay: receiptMounted ? "620ms" : "0ms" }}
              className={`flex justify-between font-bold text-[18px] transition-all duration-500 ease-out ${
                receiptMounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
              } ${netCash >= 0 ? "text-success" : "text-danger"}`}
            >
              <span>Net Cash</span>
              <span>{pkr(netCash)}</span>
            </div>
          </div>
        </div>
      )}

      {openModal && (
        <Modal title="Opening cash" subtitle="Split by payment type, or edit as needed" onClose={() => setOpenModal(false)}>
          <div className="w-36 mb-3">
            <label className="label block mb-1.5">Time</label>
            <input type="time" className="input" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>
          <CashBreakdown items={openBreakdown} onChange={setOpenBreakdown} />
          <button className="btn-primary mt-4 w-full" onClick={saveOpening}>Save opening</button>
        </Modal>
      )}

      {closeModal && (
        <Modal title="Closing cash" subtitle="Split by payment type, or edit as needed" onClose={() => setCloseModal(false)}>
          <div className="w-36 mb-3">
            <label className="label block mb-1.5">Time</label>
            <input type="time" className="input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>
          <CashBreakdown items={closeBreakdown} onChange={setCloseBreakdown} />
          <button className="btn-primary mt-4 w-full" onClick={saveClosing}>Save closing</button>
        </Modal>
      )}
    </div>
  );
}
