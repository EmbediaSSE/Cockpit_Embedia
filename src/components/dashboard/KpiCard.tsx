"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent?: "gold" | "green" | "amber" | "red" | "blue";
}

const accentClasses: Record<string, string> = {
  gold: "before:bg-gold",
  green: "before:bg-status-green",
  amber: "before:bg-status-amber",
  red: "before:bg-status-red",
  blue: "before:bg-status-blue",
};

export default function KpiCard({ label, value, sub, accent = "gold" }: KpiCardProps) {
  return (
    <div
      className={`bg-dark-2 rounded-[10px] p-5 border border-dark-4 relative overflow-hidden transition-all hover:border-dark-5 hover:-translate-y-0.5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ${accentClasses[accent]}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[1px] text-grey mb-1">
        {label}
      </div>
      <div className="text-3xl font-extrabold tracking-tight">
        {value}
      </div>
      <div className="text-[11px] text-grey mt-0.5">
        {sub}
      </div>
    </div>
  );
}
