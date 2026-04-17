"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent?: "gold" | "green" | "amber" | "red" | "blue";
  onClick?: () => void;
}

const accentClasses: Record<string, string> = {
  gold: "before:bg-gold",
  green: "before:bg-status-green",
  amber: "before:bg-status-amber",
  red: "before:bg-status-red",
  blue: "before:bg-status-blue",
};

export default function KpiCard({ label, value, sub, accent = "gold", onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-dark-2 rounded-[10px] p-5 border border-dark-4 relative overflow-hidden transition-all before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ${accentClasses[accent]} ${
        onClick
          ? "cursor-pointer hover:border-gold/60 hover:-translate-y-0.5 hover:bg-dark-3 active:scale-[0.98]"
          : "hover:border-dark-5 hover:-translate-y-0.5"
      }`}
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
      {onClick && (
        <svg
          className="absolute bottom-2.5 right-2.5 w-3 h-3 text-dark-5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
}
