"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewRecord?: () => void;
  userName: string;
  userEmail?: string;
  userRole?: string;
}

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard"     },
  { id: "projects",     label: "Projects"      },
  { id: "pipeline",     label: "Pipeline"      },
  { id: "roadmap",      label: "Roadmap"       },
  { id: "sprint",       label: "Sprint"        },
  { id: "org",          label: "Organisation"  },
  { id: "intelligence", label: "Intelligence"  },
];

// 5 items shown in the mobile bottom bar
const MOBILE_NAV = [
  {
    id: "dashboard", label: "Home",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: "projects", label: "Projects",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: "pipeline", label: "Pipeline",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: "sprint", label: "Sprint",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    id: "intelligence", label: "Intel",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

export default function Header({ activeView, onViewChange, onNewRecord, userName, userEmail, userRole }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }
    if (menuOpen || mobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, mobileMenuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* ── Desktop header ───────────────────────────────────────────────────── */}
      <header className="hidden md:flex bg-dark-2 border-b-2 border-gold px-8 py-4 justify-between items-center sticky top-0 z-50 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/embedia-logo.png" alt="Embedia.io" width={36} height={36} className="rounded" />
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gold">Embedia</span>.io
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex gap-1 bg-dark-3 rounded-lg p-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                activeView === item.id ? "bg-gold text-dark" : "text-grey hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* New + user */}
        <div className="flex items-center gap-3">
          {onNewRecord && (
            <button
              onClick={onNewRecord}
              className="flex items-center gap-1.5 px-4 py-2 bg-gold text-dark text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-right">
                <div className="text-gold text-sm font-medium">{greeting}, {userName}</div>
                <div className="text-grey text-xs">{dateStr}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gold text-dark flex items-center justify-center text-xs font-bold">{initials}</div>
              <svg className={`w-3.5 h-3.5 text-grey transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuOpen && <UserDropdown userName={userName} userEmail={userEmail} userRole={userRole} onViewChange={onViewChange} onClose={() => setMenuOpen(false)} onSignOut={handleSignOut} signingOut={signingOut} />}
          </div>
        </div>
      </header>

      {/* ── Mobile top bar ───────────────────────────────────────────────────── */}
      <header
        className="flex md:hidden items-center justify-between px-4 sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "#151515",
          borderBottom: "2px solid #F5A623",
          paddingTop: "env(safe-area-inset-top, 12px)",
          paddingBottom: "12px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/embedia-logo.png" alt="Embedia" width={28} height={28} className="rounded" />
          <span className="text-base font-bold"><span className="text-gold">Embedia</span>.io</span>
        </div>

        {/* View title */}
        <span className="text-xs font-semibold uppercase tracking-widest text-grey">
          {NAV_ITEMS.find(n => n.id === activeView)?.label ?? "Cockpit"}
        </span>

        {/* Avatar + hamburger */}
        <div className="flex items-center gap-2">
          {onNewRecord && (
            <button
              onClick={onNewRecord}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#F5A623", color: "#0D0D0D" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <div className="relative" ref={mobileMenuOpen ? menuRef : undefined}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-full bg-gold text-dark flex items-center justify-center text-xs font-bold"
            >
              {initials}
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl overflow-hidden z-[100]" style={{ background: "#151515", border: "1px solid #2A2A2A" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #2A2A2A" }}>
                  <div className="text-sm font-semibold text-white">{userName}</div>
                  {userEmail && <div className="text-xs text-grey mt-0.5">{userEmail}</div>}
                </div>
                <button onClick={() => { setMobileMenuOpen(false); onViewChange("settings"); }} className="w-full px-4 py-3 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors">
                  Settings
                </button>
                <div style={{ borderTop: "1px solid #2A2A2A" }}>
                  <button onClick={handleSignOut} disabled={signingOut} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-dark-3 transition-colors disabled:opacity-50">
                    {signingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom navigation ─────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 flex"
        style={{
          background: "#151515",
          borderTop: "1px solid #2A2A2A",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
      >
        {MOBILE_NAV.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
              style={{ color: active ? "#F5A623" : "#3A3A3A" }}
            >
              {item.icon(active)}
              <span className="text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// ── Shared user dropdown (desktop) ────────────────────────────────────────────
function UserDropdown({ userName, userEmail, userRole, onViewChange, onClose, onSignOut, signingOut }: {
  userName: string; userEmail?: string; userRole?: string;
  onViewChange: (v: string) => void; onClose: () => void;
  onSignOut: () => void; signingOut: boolean;
}) {
  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-dark-2 border border-dark-4 rounded-lg shadow-2xl overflow-hidden z-[100]">
      <div className="px-4 py-3 border-b border-dark-4">
        <div className="text-sm font-semibold text-white">{userName}</div>
        {userEmail && <div className="text-xs text-grey mt-0.5">{userEmail}</div>}
        {userRole && <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-gold/15 text-gold">{userRole}</span>}
      </div>
      <div className="py-1">
        <button onClick={() => { onClose(); onViewChange("settings"); }} className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors">
          Settings
        </button>
        {userRole === "admin" && (
          <button onClick={() => { onClose(); onViewChange("admin"); }} className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors">
            User Management
          </button>
        )}
      </div>
      <div className="border-t border-dark-4 py-1">
        <button onClick={onSignOut} disabled={signingOut} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-dark-3 transition-colors disabled:opacity-50">
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
