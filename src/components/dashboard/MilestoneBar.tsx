"use client";

interface Milestone {
  id?: string;
  label: string;
  date: string;
  status: "done" | "active" | "pending";
  onClick?: () => void;
}

interface MilestoneBarProps {
  milestones: Milestone[];
}

const dotStyles = {
  done:    "bg-status-green border-status-green",
  active:  "bg-gold border-gold shadow-[0_0_12px_rgba(245,166,35,0.25)]",
  pending: "bg-dark-2 border-dark-4",
};

export default function MilestoneBar({ milestones }: MilestoneBarProps) {
  return (
    <div className="flex gap-0 relative py-4 overflow-x-auto">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-dark-4" />
      {milestones.map((ms, i) => (
        <div
          key={i}
          onClick={ms.onClick}
          className={`flex-1 text-center relative z-10 min-w-[100px] transition-transform hover:scale-105 ${
            ms.onClick ? "cursor-pointer group" : ""
          }`}
        >
          <div className={`w-4 h-4 rounded-full mx-auto mb-1.5 border-2 transition-all ${dotStyles[ms.status]} ${
            ms.onClick ? "group-hover:ring-2 group-hover:ring-gold/40 group-hover:ring-offset-1 group-hover:ring-offset-dark-2" : ""
          }`} />
          <div className={`text-[10px] font-semibold ${ms.onClick ? "group-hover:text-gold transition-colors" : ""}`}>
            {ms.label}
          </div>
          <div className="text-[9px] text-grey">
            {ms.date}
            {ms.status === "done" && " ✓"}
          </div>
        </div>
      ))}
    </div>
  );
}
