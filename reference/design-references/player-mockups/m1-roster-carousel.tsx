"use client"

import { Home, Zap, MessageCircle, MoreHorizontal } from "lucide-react"

function PowerBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color =
    pct >= 80 ? "bg-gradient-to-r from-[#4BB9EC] to-[#FFD700]" :
    pct >= 60 ? "bg-[#4BB9EC]" :
    pct >= 40 ? "bg-[#6AC4EE]/60" :
    "bg-[#64748B]"
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold text-white/40 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-[6px] bg-[rgba(75,185,236,0.08)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-white/60 w-6 text-right">{value}</span>
    </div>
  )
}

export function M1RosterCarousel() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white flex flex-col">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-[11px] font-bold border border-[#4BB9EC]/30">AW</div>
        </div>
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC]/60 mb-1">My Team</p>
        <h2 className="font-serif text-[28px] leading-none tracking-wide text-white">BLACK HORNETS ELITE</h2>
        <p className="text-[12px] text-white/30 font-medium mt-1">Spring 2026 Season</p>
      </div>

      {/* Current Player Info Strip (above card) */}
      <div className="px-5 mb-3 shrink-0">
        <div className="rounded-[16px] bg-[#10284C] border border-[#4BB9EC]/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-full border border-[#FFD700]/15">LVL 4 Bronze</span>
              <span className="text-[10px] text-white/30 font-medium">750/800 XP</span>
            </div>
            {/* Mini badges */}
            <div className="flex gap-1">
              {['#4BB9EC', '#FFD700', '#22C55E'].map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${c}15`, border: `1px solid ${c}30` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                </div>
              ))}
            </div>
          </div>
          {/* Power bars for current player */}
          <div className="flex flex-col gap-1.5">
            <PowerBar label="HIT" value={95} />
            <PowerBar label="SRV" value={88} />
            <PowerBar label="SET" value={72} />
          </div>
        </div>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 relative px-5 flex flex-col items-center justify-start">
        {/* Background card (next player peek) */}
        <div className="absolute top-2 w-[280px] h-[380px] rounded-[18px] bg-gradient-to-b from-[#162848] to-[#0D1B3E] border border-white/5 opacity-40 scale-[0.92] translate-x-6 rotate-[3deg] z-0" />

        {/* Main Player Card */}
        <div className="relative z-10 w-[310px] rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-[#4BB9EC]/15">
          {/* Photo area - gradient placeholder with jersey number watermark */}
          <div className="relative h-[260px] bg-gradient-to-br from-[#C41E3A] via-[#8B1A2B] to-[#3D0C14] overflow-hidden">
            {/* Jersey number watermark */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-[200px] text-white/[0.06] leading-none select-none">1</span>
            </div>
            {/* Team badge */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <span className="text-[16px] font-extrabold text-[#4BB9EC]">L</span>
            </div>
            {/* Player avatar placeholder */}
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-[11px] font-bold">AW</div>
            {/* Team color accent bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C41E3A] via-[#FFD700] to-[#C41E3A]" />
          </div>

          {/* Name plate */}
          <div className="bg-[#0D1B3E] p-4 relative">
            {/* Position badge */}
            <div className="absolute -top-4 right-4 px-3 py-1 rounded-full bg-[#4BB9EC] text-[#0D1B3E] text-[10px] font-bold uppercase tracking-wider">Setter</div>
            <h3 className="font-serif text-[36px] leading-[0.95] tracking-wide text-white mt-1">AVA</h3>
            <h3 className="font-serif text-[36px] leading-[0.95] tracking-wide text-white">WILLIAMS</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-white/30 font-semibold">#1</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="text-[11px] text-[#C41E3A] font-bold">Black Hornets Elite</span>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 mt-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === 2 ? 'w-6 h-2 bg-[#4BB9EC]' : 'w-2 h-2 bg-white/10'}`}
            />
          ))}
        </div>

        {/* Swipe hint */}
        <p className="text-[10px] text-white/15 font-medium mt-2">Swipe to browse roster</p>
      </div>

      <div className="h-16 shrink-0" />

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-[#0D1B3E]/95 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex items-center justify-around shrink-0">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'gameday', icon: Zap, label: 'Game Day', active: true },
          { id: 'chat', icon: MessageCircle, label: 'Chat' },
          { id: 'more', icon: MoreHorizontal, label: 'More' },
        ].map((tab) => (
          <div key={tab.id} className="flex flex-col items-center gap-0.5">
            <tab.icon className={`w-5 h-5 ${tab.active ? 'text-[#4BB9EC]' : 'text-white/20'}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? 'text-[#4BB9EC]' : 'text-white/20'}`}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
