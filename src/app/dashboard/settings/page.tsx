"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, SectionCard } from "@/components/ui";
import { Loader2, Check, LogOut } from "lucide-react";

const BUSINESS_TYPES = [
  "Grocery Shop",
  "Medical Store",
  "Mobile Shop",
  "Hardware Shop",
  "Restaurant",
  "Retail Store",
  "Other",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, shop_name, business_type, address")
      .eq("id", user.id)
      .single();

    setFullName(profile?.full_name || "");
    setShopName(profile?.shop_name || "");
    setBusinessType(profile?.business_type || "");
    setAddress(profile?.address || "");
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        shop_name: shopName.trim() || "My Shop",
        business_type: businessType || null,
        address: address.trim() || null,
      })
      .eq("id", user.id);
    setProfileSaving(false);
    if (!error) {
      setProfileSaved(true);
      router.refresh();
      setTimeout(() => setProfileSaved(false), 2000);
    }
  }

  async function changePassword() {
    setPwError("");
    if (newPassword.length < 6) {
      setPwError("Password should be at least 6 characters.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setNewPassword("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <div className="text-sm text-ink-soft py-10 text-center">Loading your profile…</div>;
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your profile, business details, and account." />

      {/* Profile card with avatar */}
      <SectionCard title="Profile">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-display font-semibold text-[15px] shrink-0">
            {initials(fullName || shopName || "S")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[14.5px] truncate">{fullName || "Unnamed"}</p>
            <p className="text-[12.5px] text-ink-soft truncate">{email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label block mb-1.5">Your name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ahmed Khan" />
          </div>
          <div>
            <label className="label block mb-1.5">Shop name</label>
            <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Al-Khair General Store" />
          </div>
        </div>

        <button className="btn-primary flex items-center gap-2" onClick={saveProfile} disabled={profileSaving}>
          {profileSaving && <Loader2 size={15} className="animate-spin" />}
          {profileSaved && <Check size={15} />}
          {profileSaving ? "Saving…" : profileSaved ? "Saved" : "Save changes"}
        </button>
      </SectionCard>

      {/* Business details */}
      <SectionCard title="Business details">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label block mb-1.5">Business type</label>
            <select
              className="input"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-1.5">Shop address (optional)</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Main Bazaar, Lahore" />
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={saveProfile} disabled={profileSaving}>
          {profileSaving && <Loader2 size={15} className="animate-spin" />}
          {profileSaving ? "Saving…" : "Save changes"}
        </button>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <label className="label block mb-1.5">New password</label>
        <input
          className="input mb-3 max-w-xs"
          type="password"
          placeholder="At least 6 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {pwError && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3 max-w-xs">{pwError}</p>}
        <div>
          <button className="btn-secondary flex items-center gap-2" onClick={changePassword} disabled={pwSaving}>
            {pwSaving && <Loader2 size={15} className="animate-spin" />}
            {pwSaved && <Check size={15} />}
            {pwSaving ? "Updating…" : pwSaved ? "Password updated" : "Change password"}
          </button>
        </div>
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account">
        <div className="text-sm text-ink-soft space-y-1.5 mb-4">
          <p>Email: <span className="text-ink font-medium">{email}</span></p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-success font-semibold">Account active</span>
          </p>
        </div>
        <button className="btn-danger-ghost flex items-center gap-1.5" onClick={logout}>
          <LogOut size={13} /> Log out
        </button>
      </SectionCard>
    </div>
  );
}