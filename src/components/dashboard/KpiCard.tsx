"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent?: "gold" | "green" | "amber" | "red" | "blue";
  onClick?: () => void;
}

const ACCENT: Record<string, { bar: string; glow: string; text: string }> = {
  gold:  { bar: "#F5A623", glow: "rgba(245,166,35,0.15)",  text: "#F5A623" },
  green: { bar: "#27AE60", glow: "rgba(39,174,96,0.15)",   text: "#27AE60" },
  amber: { bar: "#F39C12", glow: "rgba(243,156,18,0.15)",  text: "#F39C12" },
  red:   { bar: "#E74C3C", glow: "rgba(231,76,60,0.15)",   text: "#E74C3C" },
  blue:  { bar: "#3498DB", glow: "rgba(52,152,219,0.15)",  text: "#3498DB" },
};

export default function KpiCard({
  label,
  value,
  sub,
  accent = "gold",
  onClick,
}: KpiCardProps) {
  const { bar, glow, text } = ACCENT[accent] ?? ACCENT.gold;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={`relative overflow-hidden rounded-xl border border-dark-4 bg-dark-2 p-5 transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-dark-5 hover:bg-dark-3 active:scale-[0.98]"
          : "hover:-translate-y-0.5"
      }`}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: bar }}
      />

      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${glow}, transparent 70%)`,
        }}
      />

      {/* Label */}
      <div className="text-[10px] font-semibold uppercase tracking-[1.2px] text-grey mb-1.5">
        {label}
      </div>

      {/* Value */}
      <div className="text-3xl font-extrabold tracking-tight leading-none text-white">
        {value}
      </div>

      {/* Sub */}
      <div className="text-[11px] text-grey mt-1.5 leading-snug">
        {sub}
      </div>

      {/* Drill arrow */}
      {onClick && (
        <div
          className="absolute bottom-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: glow }}
        >
          <svg
            className="w-2.5 h-2.5"
            fill="none" viewBox="0 0 24 24"
            stroke={text} strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
