"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcDay, pkr, currentMonthKey, prevMonthKey, monthLabel, ShopDay, ShopExpense } from "@/lib/calc";
import { PageHeader, SectionCard } from "@/components/ui";
import { Sparkles } from "lucide-react";

type Totals = { gross: number; dailyExp: number; profit: number; fixed: number; invProfit: number; netSavings: number; daysWithData: number };

async function getMonthTotals(supabase: ReturnType<typeof createClient>, userId: string, mKey: string): Promise<Totals> {
  const { data: dayRows } = await supabase
    .from("shop_days")
    .select("*")
    .eq("user_id", userId)
    .gte("date", `${mKey}-01`)
    .lte("date", `${mKey}-31`);

  const rows: ShopDay[] = dayRows || [];
  const expensesByDay: Record<string, ShopExpense[]> = {};
  if (rows.length) {
    const { data: expRows } = await supabase
      .from("shop_expenses")
      .select("*")
      .in("day_id", rows.map((d) => d.id));
    (expRows || []).forEach((e) => {
      if (!expensesByDay[e.day_id]) expensesByDay[e.day_id] = [];
      expensesByDay[e.day_id].push(e);
    });
  }

  let gross = 0, dailyExp = 0, profit = 0, daysWithData = 0;
  rows.forEach((d) => {
    const calc = calcDay(d, expensesByDay[d.id] || []);
    if (calc.hasOpening && calc.hasClosing) {
      gross += calc.gross;
      dailyExp += calc.expenses;
      profit += calc.profit;
      daysWithData++;
    }
  });

  const { data: me } = await supabase.from("monthly_expenses").select("rent").eq("user_id", userId).eq("month", mKey).maybeSingle();
  const { data: bills } = await supabase.from("monthly_bills").select("amount").eq("user_id", userId).eq("month", mKey);
  const fixed = Number(me?.rent || 0) + (bills || []).reduce((a, b) => a + Number(b.amount), 0);

  const { data: sold } = await supabase
    .from("inventory_items")
    .select("cost,sale_amount,sale_date")
    .eq("user_id", userId)
    .eq("status", "sold")
    .gte("sale_date", `${mKey}-01`)
    .lte("sale_date", `${mKey}-31`);
  const invProfit = (sold || []).reduce((a, i) => a + (Number(i.sale_amount || 0) - Number(i.cost)), 0);

  const netSavings = profit - fixed + invProfit;
  return { gross, dailyExp, profit, fixed, invProfit, netSavings, daysWithData };
}

export default function SavingsPage() {
  const supabase = createClient();
  const [month, setMonth] = useState(currentMonthKey());
  const [cur, setCur] = useState<Totals | null>(null);
  const [prev, setPrev] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [c, p] = await Promise.all([
      getMonthTotals(supabase, user.id, month),
      getMonthTotals(supabase, user.id, prevMonthKey(month)),
    ]);
    setCur(c);
    setPrev(p);
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !cur || !prev) {
    return <div className="text-sm text-ink-soft py-10 text-center">Crunching the numbers…</div>;
  }

  const tips: string[] = [];
  if (cur.daysWithData > 0) {
    const avgDailyGross = cur.gross / cur.daysWithData;
    if (avgDailyGross > 0) {
      const ratio = (cur.dailyExp / cur.gross) * 100;
      if (ratio > 25) {
        tips.push(`Daily shop expenses (tea, food, small buys) are eating about ${ratio.toFixed(0)}% of your sales this month — worth tracking which ones add up the most.`);
      }
    }
    if (prev.dailyExp > 0 && cur.dailyExp > prev.dailyExp * 1.1) {
      const pct = (((cur.dailyExp - prev.dailyExp) / prev.dailyExp) * 100).toFixed(0);
      tips.push(`Daily expenses are up ${pct}% compared to last month — a quick look at the expense list can show what changed.`);
    }
    if (cur.fixed > 0 && avgDailyGross > 0) {
      const daysNeeded = Math.ceil(cur.fixed / avgDailyGross);
      tips.push(`At this month's average daily sales, it takes about ${daysNeeded} day(s) of sales just to cover rent and bills.`);
    }
  } else {
    tips.push("Once you log a few days of opening and closing amounts, this tab will show you specific savings tips based on your own numbers.");
  }
  tips.push("Keep the shop's cash drawer separate from home spending — it makes the daily closing amount tell the truth.");
  tips.push("Right after a strong sales day, set aside a fixed amount for savings before it mixes into daily spending.");
  tips.push("Check the Inventory tab monthly for stock that's been sitting unsold a long time — cash stuck in old stock isn't earning anything.");

  return (
    <div>
      <PageHeader title="Savings" subtitle="Everything pulled together for the month" />

      <div className="max-w-[200px] mb-4">
        <label className="label block mb-1.5">Month</label>
        <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <SectionCard title={`Summary — ${monthLabel(month)}`}>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-ink-soft">Gross sales (shop)</span><span className="font-mono">{pkr(cur.gross)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">− Daily shop expenses</span><span className="font-mono">{pkr(cur.dailyExp)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">− Rent & monthly bills</span><span className="font-mono">{pkr(cur.fixed)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">+ Profit from sold inventory</span><span className="font-mono">{pkr(cur.invProfit)}</span></div>
          <div className={`flex justify-between font-bold text-base pt-2.5 border-t border-ink ${cur.netSavings >= 0 ? "text-success" : "text-danger"}`}>
            <span>Net Savings This Month</span><span className="font-mono">{pkr(cur.netSavings)}</span>
          </div>
        </div>
        <p className="text-xs text-ink-soft mt-3">
          Based on {cur.daysWithData} day(s) with both opening and closing amounts logged.
        </p>
      </SectionCard>

      <SectionCard title="Ways to save more">
        <div className="space-y-3">
          {tips.map((t, i) => (
            <div key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <Sparkles size={14} className="text-amber shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
