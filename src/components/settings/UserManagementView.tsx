"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface UserManagementViewProps {
  onViewChange: (view: string) => void;
}

export default function UserManagementView({ onViewChange }: UserManagementViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: true });

    if (data) setUsers(data);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteResult(null);

    try {
      // Call invite API (server-side, needs service_role)
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();

      if (res.ok) {
        setInviteResult({ type: "success", msg: `Invitation sent to ${inviteEmail}` });
        setInviteEmail("");
        loadUsers();
      } else {
        setInviteResult({ type: "error", msg: data.error || "Failed to invite user" });
      }
    } catch {
      setInviteResult({ type: "error", msg: "Network error — could not send invite" });
    }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    loadUsers();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => onViewChange("dashboard")}
          className="text-grey hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">User Management</h2>
      </div>

      {/* Invite User */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-4">Invite User</h3>

        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-1 bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gold outline-none transition-colors"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="px-5 py-2.5 bg-gold text-dark text-sm font-bold rounded-lg hover:bg-gold-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>

        {inviteResult && (
          <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${
            inviteResult.type === "success"
              ? "text-green-400 bg-green-400/10 border border-green-400/20"
              : "text-status-red bg-status-red/10 border border-status-red/20"
          }`}>
            {inviteResult.msg}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gold">
            Team Members ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-grey text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-center text-grey text-sm">
            No users found. Invite your first team member above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
                <th className="text-left px-6 py-2.5">User</th>
                <th className="text-left px-6 py-2.5">Role</th>
                <th className="text-left px-6 py-2.5">Joined</th>
                <th className="text-right px-6 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dark-4 last:border-0 hover:bg-dark-3 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold">
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{u.full_name || "—"}</div>
                        <div className="text-xs text-grey">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-dark-3 border border-dark-4 rounded px-2 py-1 text-xs text-white focus:border-gold outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-3 text-xs text-grey">
                    {new Date(u.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-[10px] text-dark-5">
                      {u.role === "admin" ? "Full access" : "Read-only"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RLS Notice */}
      <p className="text-[10px] text-dark-5 mt-4 text-center">
        User access is governed by Row Level Security (RLS). Admins have full CRUD; members have read-only access.
      </p>
    </div>
  );
}
