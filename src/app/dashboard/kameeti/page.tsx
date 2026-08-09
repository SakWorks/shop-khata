"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pkr, todayKey, fmtDateLabel, monthKeyOf, monthLabel, KameetiEntry } from "@/lib/calc";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/ui";
import { KameetiEditor } from "@/components/KameetiEditor";
import { HandCoins, Wallet, CalendarDays, User, ArrowLeft, Users, CalendarRange } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type RangeMode = "days10" | "days20" | "month" | "custom";

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function KameetiPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personParam = searchParams.get("person");

  const [entries, setEntries] = useState<KameetiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KameetiEntry | null>(null);

  const [date, setDate] = useState(todayKey());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<RangeMode>("month");
  const [customFrom, setCustomFrom] = useState(isoDaysAgo(9));
  const [customTo, setCustomTo] = useState(todayKey());
  const [peopleOpen, setPeopleOpen] = useState(false);

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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (nameFieldRef.current && !nameFieldRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const knownNames = useMemo(() => {
    const seen = new Map<string, string>();
    entries.forEach((e) => {
      const n = (e.name || "").trim();
      if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const nameSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return knownNames.slice(0, 6);
    return knownNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [name, knownNames]);

  async function addEntry() {
    if (!amount || !name.trim()) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("kameeti_entries")
      .insert({
        user_id: user.id,
        entry_date: date,
        amount: Number(amount),
        note: note.trim() || null,
        name: name.trim(),
      })
      .select()
      .single();
    setAdding(false);
    if (!error && data) {
      setEntries((prev) => [data, ...prev].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1)));
      setAmount("");
      setNote("");
      setName("");
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

  // --- Date-range filter, shared by both the table and the chart ---
  const { rangeFrom, rangeTo, rangeLabel } = useMemo(() => {
    if (range === "days10") return { rangeFrom: isoDaysAgo(9), rangeTo: todayKey(), rangeLabel: "Last 10 days" };
    if (range === "days20") return { rangeFrom: isoDaysAgo(19), rangeTo: todayKey(), rangeLabel: "Last 20 days" };
    if (range === "custom") {
      const [f, t] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
      return { rangeFrom: f, rangeTo: t, rangeLabel: `${fmtDateLabel(f)} – ${fmtDateLabel(t)}` };
    }
    const mKey = todayKey().slice(0, 7);
    return { rangeFrom: `${mKey}-01`, rangeTo: `${mKey}-31`, rangeLabel: monthLabel(mKey) };
  }, [range, customFrom, customTo]);

  const filteredEntries = useMemo(
    () => entries.filter((e) => e.entry_date >= rangeFrom && e.entry_date <= rangeTo),
    [entries, rangeFrom, rangeTo]
  );

  const filteredTotal = useMemo(
    () => filteredEntries.reduce((a, e) => a + Number(e.amount || 0), 0),
    [filteredEntries]
  );

  // Chart follows whatever's currently filtered — daily bars within the range.
  const chartData = useMemo(() => {
    const byDay = new Map<string, number>();
    filteredEntries.forEach((e) => {
      byDay.set(e.entry_date, (byDay.get(e.entry_date) || 0) + Number(e.amount || 0));
    });
    const start = new Date(rangeFrom + "T00:00:00");
    const end = new Date(rangeTo + "T00:00:00");
    const out: { name: string; total: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      out.push({ name: String(cur.getDate()), total: Math.round(byDay.get(key) || 0) });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [filteredEntries, rangeFrom, rangeTo]);

  // Group ALL entries by person (independent of the date filter — People list is a directory, not a report).
  const byPerson = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; entries: KameetiEntry[] }>();
    entries.forEach((e) => {
      const n = (e.name || "Unnamed").trim() || "Unnamed";
      const key = n.toLowerCase();
      if (!map.has(key)) map.set(key, { name: n, total: 0, count: 0, entries: [] });
      const bucket = map.get(key)!;
      bucket.total += Number(e.amount || 0);
      bucket.count += 1;
      bucket.entries.push(e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries]);

  const activePerson = personParam
    ? byPerson.find((p) => p.name.toLowerCase() === personParam.toLowerCase())
    : null;

  function openPerson(personName: string) {
    router.push(`/dashboard/kameeti?person=${encodeURIComponent(personName)}`);
  }

  function closePerson() {
    router.push(`/dashboard/kameeti`);
  }

  // ------------------------------------------------------------------
  // Full-page person history view
  // ------------------------------------------------------------------
  if (personParam) {
    if (loading) {
      return <div className="text-sm text-ink-soft py-10 text-center">Loading…</div>;
    }
    if (!activePerson) {
      return (
        <div>
          <button onClick={closePerson} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-4">
            <ArrowLeft size={15} /> Back to Kameeti
          </button>
          <EmptyState text={`No entries found for "${personParam}".`} />
        </div>
      );
    }

    const sortedEntries = activePerson.entries
      .slice()
      .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));

    return (
      <div>
        <button onClick={closePerson} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-4">
          <ArrowLeft size={15} /> Back to Kameeti
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">{activePerson.name}</h1>
            <p className="text-[13px] text-ink-soft">
              {activePerson.count} entr{activePerson.count === 1 ? "y" : "ies"} · Total {pkr(activePerson.total)}
            </p>
          </div>
        </div>

        <SectionCard title="Collection history">
          <div className="space-y-1">
            {sortedEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => setEditing(e)}
                className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-background transition-colors text-left border-b border-dashed border-border last:border-none"
              >
                <div>
                  <span className="text-sm font-medium">{fmtDateLabel(e.entry_date)}</span>
                  {e.note && <span className="text-xs text-ink-soft ml-2">{e.note}</span>}
                </div>
                <span className="font-mono text-sm font-semibold">{pkr(e.amount)}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {editing && (
          <KameetiEditor
            entry={editing}
            onClose={() => setEditing(null)}
            onSaved={() => load()}
            onDeleted={() => {
              setEditing(null);
              load();
              closePerson();
            }}
          />
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main Kameeti page
  // ------------------------------------------------------------------
  return (
    <div>
      <PageHeader title="Kameeti" subtitle="Track committee collections by date and month" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total Collected" value={pkr(totalAll)} icon={Wallet} tone="primary" />
        <StatCard label="This Month" value={pkr(thisMonthTotal)} icon={CalendarDays} tone="success" />
      </div>

      <SectionCard title={`Overview — ${rangeLabel}`}>
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: "days10", label: "Last 10 days" },
            { key: "days20", label: "Last 20 days" },
            { key: "month", label: "This Month" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                range === opt.key ? "bg-ink text-white border-ink" : "border-border text-ink-soft hover:border-ink/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setRange("custom")}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border flex items-center gap-1.5 transition-colors ${
              range === "custom" ? "bg-ink text-white border-ink" : "border-border text-ink-soft hover:border-ink/30"
            }`}
          >
            <CalendarRange size={13} /> Custom range
          </button>
        </div>

        {range === "custom" && (
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
                max={todayKey()}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">Total in range</p>
          <p className="font-mono font-bold text-2xl mt-0.5 text-primary">{pkr(filteredTotal)}</p>
        </div>

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

          <div className="relative w-44" ref={nameFieldRef}>
            <label className="label block mb-1.5">Name</label>
            <input
              className="input"
              placeholder="e.g. Ahmed"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-md max-h-44 overflow-y-auto">
                {nameSuggestions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setName(n);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
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
          <button className="btn-primary flex items-center gap-2" onClick={addEntry} disabled={adding || !name.trim() || !amount}>
            <HandCoins size={15} />
            {adding ? "Saving…" : "Save"}
          </button>
        </div>
        {!name.trim() && (
          <p className="text-[12px] text-ink-soft mt-2">Enter a name so this collection is linked to a person.</p>
        )}
      </SectionCard>

      <button
        onClick={() => setPeopleOpen((v) => !v)}
        className="w-full flex items-center justify-between card p-4 mb-4 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <Users size={16} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">People</p>
            <p className="text-[11.5px] text-ink-soft">{byPerson.length} {byPerson.length === 1 ? "person" : "people"} · tap to {peopleOpen ? "hide" : "view all"}</p>
          </div>
        </div>
      </button>

      {peopleOpen && (
        <SectionCard title="People" tag={`${byPerson.length} ${byPerson.length === 1 ? "person" : "people"}`}>
          {loading ? (
            <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
          ) : byPerson.length === 0 ? (
            <EmptyState text="No collections logged yet. Add one above, with a name." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {byPerson.map((p) => (
                <button
                  key={p.name}
                  onClick={() => openPerson(p.name)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary-soft/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <User size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11.5px] text-ink-soft">{p.count} entr{p.count === 1 ? "y" : "ies"}</p>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-sm shrink-0 ml-2">{pkr(p.total)}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title={`Collections — ${rangeLabel}`} tag={`${filteredEntries.length} entr${filteredEntries.length === 1 ? "y" : "ies"}`}>
        {loading ? (
          <p className="text-sm text-ink-soft py-6 text-center">Loading…</p>
        ) : filteredEntries.length === 0 ? (
          <EmptyState text="No collections in this range." />
        ) : (
          <div>
            {filteredEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => setEditing(e)}
                className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-none text-left hover:bg-background transition-colors px-2 -mx-2 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-primary">{fmtDateLabel(e.entry_date)}</span>
                  {e.name && <span className="text-xs font-medium ml-2">{e.name}</span>}
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
