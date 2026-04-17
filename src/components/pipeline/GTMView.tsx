"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ContentAsset {
  id: string;
  title: string;
  asset_type: string;
  status: string;
  progress_pct: number;
  audience: string | null;
  channel: string | null;
  target_date: string | null;
  summary: string | null;
  projects?: { code: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-dark-4 text-dark-5",
  review:    "bg-amber-500/15 text-amber-400",
  approved:  "bg-blue-500/15 text-blue-400",
  published: "bg-green-500/15 text-status-green",
};

const TYPE_STYLES: Record<string, string> = {
  whitepaper: "bg-purple-500/15 text-purple-400",
  article:    "bg-cyan-500/15 text-cyan-400",
  video:      "bg-red-500/15 text-red-400",
  webinar:    "bg-orange-500/15 text-orange-400",
  case_study: "bg-gold/15 text-gold",
  deck:       "bg-blue-500/15 text-blue-400",
};

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-dark-4 rounded-full h-1.5 mt-2">
      <div
        className="h-1.5 rounded-full bg-gold transition-all"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function GTMView() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("content_assets")
        .select("*, projects (code, name)")
        .order("target_date", { ascending: true });

      setAssets((data || []) as ContentAsset[]);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    // Optimistic update
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const supabase = createClient();
    await supabase.from("content_assets").update({ status }).eq("id", id);
  }

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading GTM pipeline…</div>;
  }

  const published  = assets.filter((a) => a.status === "published").length;
  const inProgress = assets.filter((a) => ["draft", "review"].includes(a.status)).length;
  const avgProgress = assets.length
    ? Math.round(assets.reduce((s, a) => s + (a.progress_pct || 0), 0) / assets.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 px-5 py-4 mb-5 flex items-center gap-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Content Pipeline</div>
          <div className="text-lg font-bold text-white">GTM Assets</div>
        </div>
        <div className="h-8 w-px bg-dark-4" />
        {[
          { label: "Total",       value: assets.length,           color: "text-white" },
          { label: "Published",   value: published,               color: "text-status-green" },
          { label: "In Progress", value: inProgress,              color: "text-amber-400" },
          { label: "Avg Progress", value: `${avgProgress}%`,      color: "text-gold" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-[10px] text-dark-5 uppercase tracking-widest">{s.label}</div>
            <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 gap-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-dark-2 border border-dark-4 rounded-xl px-5 py-4 hover:border-dark-5 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Left: type + title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${TYPE_STYLES[asset.asset_type] || "bg-dark-4 text-dark-5"}`}>
                    {asset.asset_type.replace("_", " ")}
                  </span>
                  {asset.projects && (
                    <span className="text-[9px] text-dark-5 font-mono">{asset.projects.code}</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-white leading-snug">{asset.title}</div>
                {asset.summary && (
                  <div className="text-xs text-grey mt-1 leading-relaxed line-clamp-2">{asset.summary}</div>
                )}

                {/* Progress bar */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1">
                    <ProgressBar pct={asset.progress_pct || 0} />
                  </div>
                  <span className="text-[10px] text-dark-5 w-8 text-right">{asset.progress_pct || 0}%</span>
                </div>
              </div>

              {/* Right: meta + status */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Status selector */}
                <div className="flex gap-1">
                  {["draft", "review", "approved", "published"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(asset.id, s)}
                      className={`text-[9px] px-2 py-1 rounded font-bold uppercase transition-all ${
                        asset.status === s
                          ? STATUS_STYLES[s]
                          : "bg-dark-3 text-dark-5 hover:text-grey"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Audience + channel */}
                <div className="flex items-center gap-2 text-[10px] text-dark-5">
                  {asset.audience && (
                    <span className="bg-dark-3 px-1.5 py-0.5 rounded">{asset.audience}</span>
                  )}
                  {asset.channel && (
                    <span className="bg-dark-3 px-1.5 py-0.5 rounded">{asset.channel}</span>
                  )}
                </div>

                {/* Target date */}
                {asset.target_date && (
                  <div className="text-[10px] text-dark-5">
                    {new Date(asset.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="text-center py-12 text-dark-5 text-sm border border-dashed border-dark-4 rounded-xl">
            No content assets yet
          </div>
        )}
      </div>
    </div>
  );
}
