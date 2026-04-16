"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface SettingsViewProps {
  onViewChange: (view: string) => void;
}

export default function SettingsView({ onViewChange }: SettingsViewProps) {
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    role: "",
  });
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, email, role")
          .eq("id", user.id)
          .single();

        const p = {
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          email: data?.email || user.email || "",
          role: data?.role || "member",
        };
        setProfile(p);
        setNewName(p.full_name);
      }
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("users")
        .update({ full_name: newName })
        .eq("id", user.id);
      setProfile({ ...profile, full_name: newName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    }
    setChangingPassword(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => onViewChange("dashboard")}
          className="text-grey hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">Profile</h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-grey cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
              Role
            </label>
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-gold/15 text-gold">
              {profile.role}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving || newName === profile.full_name}
              className="px-5 py-2 bg-gold text-dark text-sm font-bold rounded-lg hover:bg-gold-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {saved && <span className="text-green-400 text-xs font-medium">Saved</span>}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">Security</h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
            />
          </div>

          {passwordError && (
            <div className="text-status-red text-xs bg-status-red/10 border border-status-red/20 rounded-lg px-3 py-2">
              {passwordError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
              className="px-5 py-2 bg-dark-3 text-white text-sm font-bold rounded-lg border border-dark-4 hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {changingPassword ? "Updating..." : "Change Password"}
            </button>
            {passwordSaved && <span className="text-green-400 text-xs font-medium">Password updated</span>}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">Session</h3>
        <div className="text-sm text-grey">
          <p>Logged in as <span className="text-white font-medium">{profile.email}</span></p>
          <p className="mt-1 text-xs text-dark-5">
            Session managed by Supabase Auth. Tokens auto-refresh. Inactivity timeout applies.
          </p>
        </div>
      </div>
    </div>
  );
}
