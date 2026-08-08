"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui";
import { KameetiEntry } from "@/lib/calc";
import { Loader2, Check, Trash2 } from "lucide-react";

export function KameetiEditor({
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry: KameetiEntry;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const [date, setDate] = useState(entry.entry_date);
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    if (!amount) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("kameeti_entries")
      .update({ entry_date: date, amount: Number(amount), note: note.trim() || null })
      .eq("id", entry.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 1200);
    }
  }

  async function del() {
    setDeleting(true);
    const { error } = await supabase.from("kameeti_entries").delete().eq("id", entry.id);
    setDeleting(false);
    if (!error) onDeleted();
  }

  return (
    <Modal title="Edit collection" subtitle="Update the date, amount, or note" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1.5">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label block mb-1.5">Amount (Rs)</label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label block mb-1.5">Note (optional)</label>
          <input
            className="input"
            placeholder="e.g. Committee round 3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button className="btn-primary flex items-center gap-2" onClick={save} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saved && <Check size={15} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
          <button
            className="btn-danger-ghost flex items-center gap-1.5"
            onClick={del}
            disabled={deleting}
          >
            <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}