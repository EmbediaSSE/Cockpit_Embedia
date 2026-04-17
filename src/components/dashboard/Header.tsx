"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userName: string;
  userEmail?: string;
  userRole?: string;
}

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "projects",     label: "Projects" },
  { id: "pipeline",     label: "Pipeline" },
  { id: "roadmap",      label: "Roadmap" },
  { id: "sprint",       label: "Sprint" },
  { id: "org",          label: "Organisation" },
  { id: "intelligence", label: "Intelligence" },
];

export default function Header({ activeView, onViewChange, userName, userEmail, userRole }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // User initials for avatar
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-dark-2 border-b-2 border-gold px-8 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Image
          src="/embedia-logo.png"
          alt="Embedia.io"
          width={36}
          height={36}
          className="rounded"
        />
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-gold">Embedia</span>.io
        </h1>
      </div>

      <nav className="flex gap-1 bg-dark-3 rounded-lg p-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`px-5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              activeView === item.id
                ? "bg-gold text-dark"
                : "text-grey hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="text-right">
            <div className="text-gold text-sm font-medium">{greeting}, {userName}</div>
            <div className="text-grey text-xs">{dateStr}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gold text-dark flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-grey transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-dark-2 border border-dark-4 rounded-lg shadow-2xl overflow-hidden z-[100]">
            {/* User info */}
            <div className="px-4 py-3 border-b border-dark-4">
              <div className="text-sm font-semibold text-white">{userName}</div>
              {userEmail && <div className="text-xs text-grey mt-0.5">{userEmail}</div>}
              {userRole && (
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-gold/15 text-gold">
                  {userRole}
                </span>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setMenuOpen(false); onViewChange("settings"); }}
                className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>

              {userRole === "admin" && (
                <button
                  onClick={() => { setMenuOpen(false); onViewChange("admin"); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-grey hover:text-white hover:bg-dark-3 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  User Management
                </button>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-dark-4 py-1">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-dark-3 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
