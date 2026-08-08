"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calcDay,
  pkr,
  currentMonthKey,
  lastNDays,
  fmtDateLabel,
  ShopDay,
  ShopExpense,
  SavingsEntry,
} from "@/lib/calc";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import { DayEditor } from "@/components/DayEditor";
import { CircleToggle } from "@/components/CircleToggle";
import { Wallet, PiggyBank } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const DAY_OPTIONS = [5, 10, 15, 30] as const;

export default function HistoryPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"days" | "month">("days");
  const [dayCount, setDayCount] = useState<number>(10);
  const [month, setMonth] = useState(currentMonthKey());
  const [days, setDays] = useState<ShopDay[]>([]);
  const [expensesByDay, setExpensesByDay] = useState<Record<string, ShopExpense[]>>({});
  const [savingsByDate, setSavingsByDate] = useState<Record<string, SavingsEntry>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [metric, setMetric] = useState<"profit" | "saved">("profit");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let from: string, to: string;
    if (mode === "days") {
      const range = lastNDays(dayCount);
      from = range[0];
      to = range[range.length - 1];
    } else {
      from = `${month}-01`;
      to = `${month}-31`;
    }

    let query = supabase.from("shop_days").select("*").eq("user_id", user.id);
    query = query.gte("date", from).lte("date", to);
    const { data: dayRows } = await query.order("date", { ascending: true });
    const rows = dayRows || [];
    setDays(rows);

    if (rows.length) {
      const { data: expRows } = await supabase
        .from("shop_expenses")
        .select("*")
        .in("day_id", rows.map((d) => d.id));
      const map: Record<string, ShopExpense[]> = {};
      (expRows || []).forEach((e) => {
        if (!map[e.day_id]) map[e.day_id] = [];
        map[e.day_id].push(e);
      });
      setExpensesByDay(map);
    } else {
      setExpensesByDay({});
    }

    const { data: savingsRows } = await supabase
      .from("savings_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", to);
    const sMap: Record<string, SavingsEntry> = {};
    (savingsRows || []).forEach((s) => (sMap[s.date] = s));
    setSavingsByDate(sMap);

    setLoading(false);
  }, [supabase, mode, dayCount, month]);

  useEffect(() => {
    load();
  }, [load]);

  const dateKeys = mode === "days" ? lastNDays(dayCount) : days.map((d) => d.date).sort();
  const byDate: Record<string, ShopDay> = {};
  days.forEach((d) => (byDate[d.date] = d));

  let totalGross = 0, totalExp = 0, totalProfit = 0, totalSaved = 0;
  const rows = dateKeys.map((k) => {
    const dayRow = byDate[k];
    const calc = calcDay(dayRow, dayRow ? expensesByDay[dayRow.id] || [] : []);
    const hasData = calc.hasOpening && calc.hasClosing;
    const saved = savingsByDate[k]?.amount || 0;
    if (hasData) {
      totalGross += calc.gross;
      totalExp += calc.expenses;
      totalProfit += calc.profit;
    }
    totalSaved += saved;
    return { key: k, calc, hasData, saved };
  });

  const profitChartData = rows.map((r) => ({
    name: r.key.slice(8, 10),
    value: r.hasData ? Math.round(r.calc.profit) : 0,
  }));

  const savingsChartData = rows.map((r) => ({
    name: r.key.slice(8, 10),
    value: Math.round(r.saved),
  }));

  return (
    <div>
      <PageHeader title="History & Stats" subtitle="Track your daily performance over time" />

      <SectionCard title="View">
        <div className="flex flex-wrap gap-2 mb-4">
          {DAY_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => { setMode("days"); setDayCount(n); }}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border ${
                mode === "days" && dayCount === n ? "bg-ink text-white border-ink" : "border-border text-ink-soft"
              }`}
            >
              Last {n} days
            </button>
          ))}
          <button
            onClick={() => setMode("month")}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border ${
              mode === "month" ? "bg-ink text-white border-ink" : "border-border text-ink-soft"
            }`}
          >
            Select month
          </button>
        </div>
        {mode === "month" && (
          <input
            type="month"
            className="input max-w-[180px] mb-4"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        )}

        {loading ? (
          <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
        ) : (
          <>
            <CircleToggle
              options={[
                { key: "profit", label: "Net Profit", icon: Wallet, tone: "primary" },
                { key: "saved", label: "Saved", icon: PiggyBank, tone: "success" },
              ]}
              active={metric}
              onChange={(k) => setMetric(k as "profit" | "saved")}
            />

            <div className="text-center mb-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
                {metric === "profit" ? "Total Net Profit" : "Total Saved"}
              </p>
              <p
                className={`font-mono font-bold text-2xl mt-0.5 ${
                  metric === "profit" ? (totalProfit >= 0 ? "text-primary" : "text-danger") : "text-success"
                }`}
              >
                {pkr(metric === "profit" ? totalProfit : totalSaved)}
              </p>
            </div>

            <div className="h-[180px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metric === "profit" ? profitChartData : savingsChartData}>
                  <CartesianGrid vertical={false} stroke="#EEF0F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(v) => [pkr(Number(v ?? 0)), metric === "profit" ? "Net Profit" : "Saved"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EE" }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    fill={metric === "profit" ? "#4F46E5" : "#10B981"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {metric === "saved" && (
              <div className="mb-4">
                {rows.filter((r) => r.saved > 0).length === 0 ? (
                  <EmptyState text="No savings logged in this range yet." />
                ) : (
                  <div className="space-y-1.5">
                    {rows
                      .filter((r) => r.saved > 0)
                      .map((r) => (
                        <div
                          key={r.key}
                          onClick={() => setSelectedDate(r.key)}
                          className="flex items-center justify-between py-1.5 px-1 cursor-pointer hover:bg-background rounded-lg text-sm"
                        >
                          <span className="text-primary">{fmtDateLabel(r.key)}</span>
                          <span className="font-mono font-semibold text-success">{pkr(r.saved)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {rows.every((r) => !r.hasData) ? (
              <EmptyState text="No entries in this range yet." />
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-2 mt-4">Tap a date to view its receipt or edit its entries.</p>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-ink-soft border-b border-ink">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-right py-2 font-medium">Gross Sales</th>
                      <th className="text-right py-2 font-medium">Expenses</th>
                      <th className="text-right py-2 font-medium">Net Profit</th>
                      <th className="text-right py-2 font-medium">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.key}
                        onClick={() => setSelectedDate(r.key)}
                        className="border-b border-dashed border-border cursor-pointer hover:bg-background transition-colors"
                      >
                        <td className="py-2">
                          <span className="text-primary hover:underline">{fmtDateLabel(r.key)}</span>
                        </td>
                        <td className="py-2 text-right font-mono">{r.hasData ? pkr(r.calc.gross) : "—"}</td>
                        <td className="py-2 text-right font-mono">{r.hasData ? pkr(r.calc.expenses) : "—"}</td>
                        <td className={`py-2 text-right font-mono font-semibold ${r.hasData ? (r.calc.profit >= 0 ? "text-success" : "text-danger") : ""}`}>
                          {r.hasData ? pkr(r.calc.profit) : "—"}
                        </td>
                        <td className="py-2 text-right font-mono text-primary">{r.saved ? pkr(r.saved) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink font-bold">
                      <td className="py-2.5">Total</td>
                      <td className="py-2.5 text-right font-mono">{pkr(totalGross)}</td>
                      <td className="py-2.5 text-right font-mono">{pkr(totalExp)}</td>
                      <td className={`py-2.5 text-right font-mono ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
                        {pkr(totalProfit)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-primary">{pkr(totalSaved)}</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </>
            )}
          </>
        )}
      </SectionCard>

      {selectedDate && (
        <DayEditor
          dateKey={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}