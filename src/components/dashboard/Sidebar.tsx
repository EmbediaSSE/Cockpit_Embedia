"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewRecord: () => void;
  onChatToggle: () => void;
  chatOpen: boolean;
  userName: string;
  userEmail?: string;
  userRole?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconHome({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconGrid({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconBars({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconMap({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function IconClipboard({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconUsers({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function IconBolt({ gold }: { gold: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={gold ? "#F5A623" : "currentColor"} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function IconAI() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconChevrons({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",    Icon: IconHome      },
  { id: "projects",     label: "Projects",     Icon: IconGrid      },
  { id: "pipeline",     label: "Pipeline",     Icon: IconBars      },
  { id: "roadmap",      label: "Roadmap",      Icon: IconMap       },
  { id: "sprint",       label: "Sprint",       Icon: IconClipboard },
  { id: "org",          label: "Organisation", Icon: IconUsers     },
  { id: "intelligence", label: "Intelligence", Icon: IconBolt      },
];

const MOBILE_IDS = ["dashboard", "projects", "pipeline", "sprint", "intelligence"];
const MOBILE_NAV = NAV_ITEMS.filter((n) => MOBILE_IDS.includes(n.id));

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  activeView,
  onViewChange,
  onNewRecord,
  onChatToggle,
  chatOpen,
  userName,
  userEmail,
  userRole,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Persist collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("sidebar-collapsed", String(!c)); } catch {}
      return !c;
    });
  };

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Morning" :
    now.getHours() < 18 ? "Afternoon" : "Evening";

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col h-full border-r border-dark-4 flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
        aria-label="Main navigation"
        style={{ backgroundColor: "#111111", width: collapsed ? "64px" : "240px" }}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-dark-4 px-3 gap-3 flex-shrink-0 overflow-hidden ${collapsed ? "justify-center" : ""}`}>
          <Image src="/embedia-logo.png" alt="Embedia" width={32} height={32}
            className="rounded flex-shrink-0" />
          <div className={`overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
            <div className="text-sm font-bold whitespace-nowrap">
              <span className="text-gold">Embedia</span>.io
            </div>
            <div className="text-[10px] text-grey whitespace-nowrap">War Room Cockpit</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" role="navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                title={collapsed ? label : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group overflow-hidden ${
                  active
                    ? "bg-gold/10 text-gold"
                    : "text-grey hover:text-white hover:bg-white/5"
                }`}
              >
                {/* Active indicator pill */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
                )}
                <Icon gold={active} />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                } ${active ? "text-gold" : ""}`}>
                  {label}
                </span>
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-dark-3 border border-dark-4 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-dark-4 p-2 space-y-1.5 flex-shrink-0">
          {/* Ask AI */}
          <button
            onClick={onChatToggle}
            title={collapsed ? "Ask AI" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border overflow-hidden ${
              chatOpen
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-dark-4 text-grey hover:text-white hover:border-dark-5 hover:bg-white/5"
            }`}
          >
            <IconAI />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"}`}>
              Ask AI
            </span>
          </button>

          {/* New Record */}
          <button
            onClick={onNewRecord}
            title={collapsed ? "New Record" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer bg-gold text-dark hover:bg-gold/90 active:scale-[0.98] overflow-hidden"
          >
            <IconPlus />
            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"}`}>
              New Record
            </span>
          </button>
        </div>

        {/* User section */}
        <div className="border-t border-dark-4 p-2 flex-shrink-0" ref={menuRef}>
          {/* Avatar + name */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer ${collapsed ? "justify-center" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-gold text-dark flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className={`flex-1 text-left overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>
                <div className="text-xs font-semibold text-white truncate">{userName}</div>
                <div className="text-[10px] text-grey truncate">{greeting}</div>
              </div>
              {!collapsed && (
                <svg className={`w-3.5 h-3.5 text-grey flex-shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              )}
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className={`absolute bottom-full mb-2 bg-dark-2 border border-dark-4 rounded-xl shadow-2xl overflow-hidden z-[100] ${
                collapsed ? "left-full ml-2 w-56" : "left-0 right-0"
              }`}>
                <div className="px-4 py-3 border-b border-dark-4">
                  <div className="text-sm font-semibold text-white">{userName}</div>
                  {userEmail && <div className="text-xs text-grey mt-0.5">{userEmail}</div>}
                  {userRole && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-gold/15 text-gold">
                      {userRole}
                    </span>
                  )}
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); onViewChange("settings"); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors"
                  >
                    Settings
                  </button>
                  {userRole === "admin" && (
                    <button
                      onClick={() => { setUserMenuOpen(false); onViewChange("admin"); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors"
                    >
                      User Management
                    </button>
                  )}
                </div>
                <div className="border-t border-dark-4 py-1">
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-dark-3 transition-colors disabled:opacity-50"
                  >
                    {signingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-1 w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-grey hover:text-white hover:bg-white/5 transition-all cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            <IconChevrons collapsed={collapsed} />
            <span className={`text-xs whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"}`}>
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ─────────────────────────────────────── */}
      <header
        className="flex md:hidden items-center justify-between px-4 sticky top-0 z-50 flex-shrink-0"
        style={{
          background: "#111111",
          borderBottom: "1px solid #1E1E1E",
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          paddingBottom: "12px",
          minHeight: "56px",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2">
          <Image src="/embedia-logo.png" alt="Embedia" width={26} height={26} className="rounded" />
          <span className="text-sm font-bold">
            <span className="text-gold">Embedia</span>.io
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-grey">
          {NAV_ITEMS.find((n) => n.id === activeView)?.label ?? "Cockpit"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onChatToggle}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              chatOpen ? "border-gold/50 text-gold bg-gold/10" : "border-dark-4 text-grey"
            }`}
          >
            <IconAI />
          </button>
          <button
            onClick={onNewRecord}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold text-dark cursor-pointer"
          >
            <IconPlus />
          </button>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ──────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 flex"
        style={{
          background: "#111111",
          borderTop: "1px solid #1E1E1E",
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
        aria-label="Mobile navigation"
      >
        {MOBILE_NAV.map(({ id, label, Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all cursor-pointer"
              style={{ color: active ? "#F5A623" : "#3A3A3A" }}
            >
              <Icon gold={active} />
              <span className="text-[9px] font-semibold uppercase tracking-wide">
                {label.slice(0, 5)}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
