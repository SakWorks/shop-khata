"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { pkr, todayKey, fmtDateLabel, monthKeyOf, monthLabel, KameetiEntry } from "@/lib/calc";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/ui";
import { KameetiEditor } from "@/components/KameetiEditor";
import { HandCoins, Wallet, CalendarDays } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function KameetiPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<KameetiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KameetiEntry | null>(null);

  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("kameeti_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry() {
    if (!amount) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("kameeti_entries")
      .insert({ user_id: user.id, entry_date: date, amount: Number(amount), note: note.trim() || null })
      .select()
      .single();
    setAdding(false);
    if (!error && data) {
      setEntries((prev) => [data, ...prev].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1)));
      setAmount("");
      setNote("");
      setDate(todayKey());
    }
  }

  const totalAll = useMemo(() => entries.reduce((a, e) => a + Number(e.amount || 0), 0), [entries]);

  const thisMonthTotal = useMemo(() => {
    const mKey = todayKey().slice(0, 7);
    return entries
      .filter((e) => monthKeyOf(e.entry_date) === mKey)
      .reduce((a, e) => a + Number(e.amount || 0), 0);
  }, [entries]);

  const chartData = useMemo(() => {
    // last 6 months, oldest to newest
    const months: string[] = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months.map((mKey) => ({
      name: monthLabel(mKey).split(" ")[0].slice(0, 3),
      total: entries
        .filter((e) => monthKeyOf(e.entry_date) === mKey)
        .reduce((a, e) => a + Number(e.amount || 0), 0),
    }));
  }, [entries]);

  return (
    <div>
      <PageHeader title="Kameeti" subtitle="Track committee collections by date and month" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total Collected" value={pkr(totalAll)} icon={Wallet} tone="primary" />
        <StatCard label="This Month" value={pkr(thisMonthTotal)} icon={CalendarDays} tone="success" />
      </div>

      <SectionCard title="Monthly overview">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#EEF0F5" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9297AC" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                formatter={(v) => [pkr(Number(v ?? 0)), "Collected"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EE" }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Add a collection">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="label block mb-1.5">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="w-32">
            <label className="label block mb-1.5">Amount (Rs)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="label block mb-1.5">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Round 3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={addEntry} disabled={adding}>
            <HandCoins size={15} />
            {adding ? "Saving…" : "Save"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="All collections" tag={`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}>
        {loading ? (
          <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState text="No collections logged yet. Add your first one above." />
        ) : (
          <div>
            {entries.map((e) => (
              <button
                key={e.id}
                onClick={() => setEditing(e)}
                className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-none text-left hover:bg-background transition-colors px-2 -mx-2 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-primary">{fmtDateLabel(e.entry_date)}</span>
                  {e.note && <span className="text-xs text-ink-soft ml-2">{e.note}</span>}
                </div>
                <span className="font-mono text-sm font-semibold">{pkr(e.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {editing && (
        <KameetiEditor
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            load();
          }}
          onDeleted={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}