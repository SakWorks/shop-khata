"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Wallet, Percent, PiggyBank, CalendarRange } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PRESET_DAY_OPTIONS = [10, 15, 30] as const;

type ViewMode = "days" | "month" | "custom";
type MetricKey = "netCash" | "five" | "fifteen" | "saved";

// Each metric owns its own color, used consistently for its toggle button,
// its total figure, its bar chart, and its table column.
const METRICS: {
  key: MetricKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string; // hex, used for bar fill / accents
  textClass: string;
  bgSoftClass: string;
  borderClass: string;
}[] = [
  {
    key: "netCash",
    label: "Net Cash",
    shortLabel: "Net Cash",
    icon: Wallet,
    color: "#4F46E5",
    textClass: "text-indigo-600",
    bgSoftClass: "bg-indigo-50",
    borderClass: "border-indigo-200",
  },
  {
    key: "five",
    label: "5% of Net Amount",
    shortLabel: "5%",
    icon: Percent,
    color: "#F59E0B",
    textClass: "text-amber-600",
    bgSoftClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  {
    key: "fifteen",
    label: "15% of Net Amount",
    shortLabel: "15%",
    icon: Percent,
    color: "#EC4899",
    textClass: "text-pink-600",
    bgSoftClass: "bg-pink-50",
    borderClass: "border-pink-200",
  },
  {
    key: "saved",
    label: "Last Saved Amount",
    shortLabel: "Saved",
    icon: PiggyBank,
    color: "#10B981",
    textClass: "text-emerald-600",
    bgSoftClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
  },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Every date string between from and to (inclusive), ascending. */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return out;
  const cur = new Date(start);
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export default function HistoryPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<ViewMode>("days");
  const [dayCount, setDayCount] = useState<number>(10);
  const [month, setMonth] = useState(currentMonthKey());
  const [customFrom, setCustomFrom] = useState(lastNDays(10)[0]);
  const [customTo, setCustomTo] = useState(todayISO());
  const [days, setDays] = useState<ShopDay[]>([]);
  const [expensesByDay, setExpensesByDay] = useState<Record<string, ShopExpense[]>>({});
  const [savingsByDate, setSavingsByDate] = useState<Record<string, SavingsEntry>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>("netCash");

  const { from, to } = useMemo(() => {
    if (mode === "days") {
      const range = lastNDays(dayCount);
      return { from: range[0], to: range[range.length - 1] };
    }
    if (mode === "month") {
      return { from: `${month}-01`, to: `${month}-31` };
    }
    // custom
    return customFrom <= customTo
      ? { from: customFrom, to: customTo }
      : { from: customTo, to: customFrom };
  }, [mode, dayCount, month, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: dayRows } = await supabase
      .from("shop_days")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });
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
  }, [supabase, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const dateKeys = useMemo(() => {
    if (mode === "month") return days.map((d) => d.date).sort();
    return datesBetween(from, to);
  }, [mode, days, from, to]);

  const byDate: Record<string, ShopDay> = {};
  days.forEach((d) => (byDate[d.date] = d));

  const rows = dateKeys.map((k) => {
    const dayRow = byDate[k];
    const calc = calcDay(dayRow, dayRow ? expensesByDay[dayRow.id] || [] : []);
    const hasData = calc.hasOpening && calc.hasClosing;
    const saved = savingsByDate[k]?.amount || 0;

    // Same "Net Amount" logic as the Today page: Opening minus Expenses first,
    // then Closing minus that adjusted Opening.
    const adjustedOpening = calc.opening - calc.expenses;
    const netAmount = hasData ? calc.closing - adjustedOpening : 0;
    const five = hasData ? netAmount * 0.05 : 0;
    const fifteen = hasData ? netAmount * 0.15 : 0;
    const netCash = hasData ? netAmount - five - fifteen : 0;

    return {
      key: k,
      calc,
      hasData,
      saved,
      values: { netCash, five, fifteen, saved } as Record<MetricKey, number>,
    };
  });

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const total = rows.reduce((a, r) => a + (r.hasData || metric === "saved" ? r.values[metric] : 0), 0);

  const chartData = rows.map((r) => ({
    name: r.key.slice(8, 10),
    value: Math.round(r.values[metric]),
  }));

  const rowsWithValue = rows.filter((r) => (metric === "saved" ? r.saved > 0 : r.hasData));

  return (
    <div>
      <PageHeader title="History & Stats" subtitle="Track your daily performance over time" />

      <SectionCard title="View">
        {/* Date range controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_DAY_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => { setMode("days"); setDayCount(n); }}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                mode === "days" && dayCount === n ? "bg-ink text-white border-ink" : "border-border text-ink-soft hover:border-ink/30"
              }`}
            >
              Last {n} days
            </button>
          ))}
          <button
            onClick={() => setMode("month")}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
              mode === "month" ? "bg-ink text-white border-ink" : "border-border text-ink-soft hover:border-ink/30"
            }`}
          >
            Select month
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border flex items-center gap-1.5 transition-colors ${
              mode === "custom" ? "bg-ink text-white border-ink" : "border-border text-ink-soft hover:border-ink/30"
            }`}
          >
            <CalendarRange size={13} /> Custom range
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

        {mode === "custom" && (
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="label block mb-1.5">From</label>
              <input
                type="date"
                className="input"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label block mb-1.5">To</label>
              <input
                type="date"
                className="input"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
        ) : (
          <>
            {/* 4-way metric toggle — each with its own color */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              {METRICS.map((m) => {
                const Icon = m.icon;
                const isActive = metric === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3.5 px-2 transition-all ${
                      isActive ? `${m.borderClass} ${m.bgSoftClass}` : "border-border bg-background hover:border-ink/20"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: isActive ? m.color : "#E5E7EE" }}
                    >
                      <Icon size={15} color={isActive ? "white" : "#9297AC"} />
                    </div>
                    <span className={`text-[11.5px] font-semibold ${isActive ? m.textClass : "text-ink-soft"}`}>
                      {m.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center mb-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
                Total {activeMetric.label}
              </p>
              <p className={`font-mono font-bold text-2xl mt-0.5 ${activeMetric.textClass}`}>
                {pkr(total)}
              </p>
            </div>

            <div className="h-[180px] mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="#EEF0F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(v) => [pkr(Number(v ?? 0)), activeMetric.label]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EE" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={activeMetric.color} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {rowsWithValue.length === 0 ? (
              <EmptyState text="No entries in this range yet." />
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-2">Tap a date to view its receipt or edit its entries.</p>
                <div className={`overflow-x-auto rounded-xl border ${activeMetric.borderClass}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-[11px] uppercase tracking-wide ${activeMetric.textClass} ${activeMetric.bgSoftClass} border-b ${activeMetric.borderClass}`}>
                        <th className="text-left py-2.5 px-3 font-semibold">Date</th>
                        <th className="text-right py-2.5 px-3 font-semibold">{activeMetric.label}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.key}
                          onClick={() => setSelectedDate(r.key)}
                          className="border-b border-dashed border-border cursor-pointer hover:bg-background transition-colors last:border-none"
                        >
                          <td className="py-2 px-3">
                            <span className="text-ink hover:underline">{fmtDateLabel(r.key)}</span>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-semibold ${activeMetric.textClass}`}>
                            {(metric === "saved" ? r.saved > 0 : r.hasData) ? pkr(r.values[metric]) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={`border-t-2 border-ink font-bold ${activeMetric.bgSoftClass}`}>
                        <td className="py-2.5 px-3">Total</td>
                        <td className={`py-2.5 px-3 text-right font-mono ${activeMetric.textClass}`}>{pkr(total)}</td>
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
