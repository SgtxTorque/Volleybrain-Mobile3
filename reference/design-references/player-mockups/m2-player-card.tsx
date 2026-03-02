"use client"

import { Share2, BarChart3 } from "lucide-react"

function PowerBarCompact({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color =
    pct >= 80 ? "bg-gradient-to-r from-[#4BB9EC] to-[#FFD700]" :
    pct >= 60 ? "bg-[#4BB9EC]" :
    pct >= 40 ? "bg-[#6AC4EE]/60" :
    "bg-[#64748B]"
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-bold text-white/35 tracking-wider uppercase">{label}</span>
        <span className="text-[9px] font-bold text-white/70">{value}</span>
      </div>
      <div className="h-[5px] bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function M2PlayerCard() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white flex flex-col items-center">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-4 w-full">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-[11px] font-bold border border-[#4BB9EC]/30">AW</div>
        </div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-center text-white/25">My Player Card</p>
      </div>

      {/* The Trading Card */}
      <div className="relative px-5 flex-1 flex flex-col items-center">
        {/* Glow effect behind card */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[280px] h-[420px] rounded-[20px] bg-[#4BB9EC]/5 blur-[40px]" />

        <div className="relative w-[320px] rounded-[14px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(75,185,236,0.08)] border border-[#4BB9EC]/20">
          {/* === TOP 60%: Photo Area === */}
          <div className="relative h-[280px] bg-gradient-to-br from-[#C41E3A] via-[#8B1A2B] to-[#2A0A12] overflow-hidden">
            {/* Huge jersey number watermark */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-[260px] text-white/[0.05] leading-none select-none pointer-events-none">1</span>
            </div>

            {/* Diagonal accent lines */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[200px] h-[600px] bg-gradient-to-bl from-[#FFD700]/[0.04] to-transparent rotate-[20deg] translate-x-[40px] -translate-y-[80px]" />
              <div className="absolute top-0 right-0 w-[120px] h-[600px] bg-gradient-to-bl from-white/[0.02] to-transparent rotate-[20deg] translate-x-[90px] -translate-y-[80px]" />
            </div>

            {/* Lynx logo top-left */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <span className="text-[16px] font-extrabold text-[#4BB9EC]">L</span>
            </div>

            {/* Player avatar top-right */}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border-2 border-white/25 flex items-center justify-center text-[12px] font-bold text-white/80">AW</div>

            {/* Season badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30">
              <span className="text-[9px] font-bold text-[#FFD700] tracking-wider">2026 SPRING</span>
            </div>

            {/* Team color bar at bottom of photo */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C41E3A] via-[#FFD700] to-[#C41E3A]" />
          </div>

          {/* === BOTTOM 40%: Info Panel === */}
          <div className="bg-[#0A1528] relative">
            {/* OVR Badge - floating between sections */}
            <div className="absolute -top-7 right-5 w-14 h-14 z-10">
              <div className="w-full h-full bg-[#0A1528] border-2 border-[#FFD700]/50 flex flex-col items-center justify-center badge-glow" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="font-serif text-[22px] leading-none text-[#FFD700]">56</span>
                <span className="text-[6px] font-bold text-[#FFD700]/50 tracking-wider">OVR</span>
              </div>
            </div>

            {/* Rookie label */}
            <div className="absolute -top-3 left-5">
              <span className="text-[8px] font-bold text-[#0A1528] bg-[#FFD700] px-2.5 py-0.5 rounded-sm tracking-[0.15em] uppercase">Rookie Card</span>
            </div>

            <div className="p-5 pt-4">
              {/* Player name - massive condensed type */}
              <h2 className="font-serif text-[44px] leading-[0.9] tracking-wide text-white">AVA</h2>
              <h2 className="font-serif text-[44px] leading-[0.9] tracking-wide text-white">WILLIAMS</h2>

              {/* Position & team */}
              <div className="flex items-center gap-2 mt-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-[#4BB9EC]/15 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="#4BB9EC"><circle cx="5" cy="5" r="4" /></svg>
                  </div>
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Setter</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-white/15" />
                <span className="text-[11px] font-bold text-[#C41E3A] tracking-wider">Black Hornets Elite</span>
              </div>

              {/* Stat Power Bars */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <PowerBarCompact label="HIT" value={100} />
                <PowerBarCompact label="SRV" value={100} />
                <PowerBarCompact label="AST" value={88} max={100} />
                <PowerBarCompact label="BLK" value={5} />
                <PowerBarCompact label="DIG" value={62} />
                <PowerBarCompact label="ACE" value={74} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions below card */}
        <div className="flex items-center gap-3 mt-6 w-[320px]">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4BB9EC] text-[#0D1B3E] text-[12px] font-bold">
            <Share2 className="w-4 h-4" />
            Share Card
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10284C] border border-[#4BB9EC]/15 text-white text-[12px] font-bold">
            <BarChart3 className="w-4 h-4 text-[#4BB9EC]" />
            View Stats
          </button>
        </div>
      </div>

      <div className="h-20 shrink-0" />
    </div>
  )
}
