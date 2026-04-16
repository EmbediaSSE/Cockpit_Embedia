"use client";

import { useState } from "react";

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userName: string;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Projects" },
  { id: "pipeline", label: "Pipeline" },
  { id: "sprint", label: "Sprint" },
];

export default function Header({ activeView, onViewChange, userName }: HeaderProps) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="bg-dark-2 border-b-2 border-gold px-8 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl">
      <h1 className="text-xl font-bold tracking-tight">
        <span className="text-gold">Embedia</span>.io
      </h1>

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

      <div className="text-right">
        <div className="text-gold text-sm font-medium">{greeting}, {userName}</div>
        <div className="text-grey text-xs">{dateStr} — CEO Cockpit</div>
      </div>
    </header>
  );
}
