"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calcDay,
  pkr,
  currentMonthKey,
  last10Days,
  fmtDateLabel,
  ShopDay,
  ShopExpense,
} from "@/lib/calc";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import { DayEditor } from "@/components/DayEditor";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function HistoryPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"last10" | "month">("last10");
  const [month, setMonth] = useState(currentMonthKey());
  const [days, setDays] = useState<ShopDay[]>([]);
  const [expensesByDay, setExpensesByDay] = useState<Record<string, ShopExpense[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase.from("shop_days").select("*").eq("user_id", user.id);
    if (mode === "last10") {
      const range = last10Days();
      query = query.gte("date", range[0]).lte("date", range[range.length - 1]);
    } else {
      query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
    }
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
    setLoading(false);
  }, [supabase, mode, month]);

  useEffect(() => {
    load();
  }, [load]);

  const dateKeys = mode === "last10" ? last10Days() : days.map((d) => d.date).sort();
  const byDate: Record<string, ShopDay> = {};
  days.forEach((d) => (byDate[d.date] = d));

  let totalGross = 0, totalExp = 0, totalProfit = 0;
  const rows = dateKeys.map((k) => {
    const dayRow = byDate[k];
    const calc = calcDay(dayRow, dayRow ? expensesByDay[dayRow.id] || [] : []);
    const hasData = calc.hasOpening && calc.hasClosing;
    if (hasData) {
      totalGross += calc.gross;
      totalExp += calc.expenses;
      totalProfit += calc.profit;
    }
    return { key: k, calc, hasData };
  });

  const chartData = rows.map((r) => ({
    name: r.key.slice(8, 10),
    profit: r.hasData ? Math.round(r.calc.profit) : 0,
  }));

  return (
    <div>
      <PageHeader title="History & Stats" subtitle="Track your daily performance over time" />

      <SectionCard title="View">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("last10")}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border ${
              mode === "last10" ? "bg-ink text-white border-ink" : "border-border text-ink-soft"
            }`}
          >
            Last 10 days
          </button>
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
            <div className="h-[180px] mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="#EEF0F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(v) => [pkr(Number(v ?? 0)), "Net Profit"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EE" }}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]} fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {rows.every((r) => !r.hasData) ? (
              <EmptyState text="No entries in this range yet." />
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-2">Tap a date to view or edit its entries.</p>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-ink-soft border-b border-ink">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-right py-2 font-medium">Gross Sales</th>
                      <th className="text-right py-2 font-medium">Expenses</th>
                      <th className="text-right py-2 font-medium">Net Profit</th>
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