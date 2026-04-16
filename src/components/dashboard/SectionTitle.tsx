"use client";

export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[1.8px] text-gold my-6 flex items-center gap-2">
      {children}
      <div className="flex-1 h-px bg-gradient-to-r from-gold-dim to-transparent" />
    </div>
  );
}
