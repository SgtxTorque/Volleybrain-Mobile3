"use client"

/* ===================================================================
   T3: LIVE MATCH — TIER 2 RALLY STAT TRACKING
   Quick-entry stat grid. After each rally, coach taps players and
   records actions. Thumbs up/down speed, not forms.
   Left: mini court | Right: stat tracking grid
   Bottom: persistent scoreboard
   =================================================================== */

const onCourtPlayers = [
  { num: 7,  name: "Jade",     summary: "2 passes, 1 hit error, on point" },
  { num: 11, name: "Kira",     summary: "1 successful hit, 1 block, 1 kill" },
  { num: 24, name: "Payton",   summary: "1 assist, 1 set not to target" },
  { num: 19, name: "Mckenzie", summary: "" },
  { num: 8,  name: "Sophia",   summary: "" },
  { num: 1,  name: "Ashley",   summary: "" },
]

// Which stat buttons are "filled" for demo -- [passing+, passing-, hitting+, hitting-, setting+, setting-, point+, point-]
const statStates: Record<number, boolean[]> = {
  7:  [true, true, false, false, false, false, false, true],
  11: [false, false, true, true, false, false, false, false],
  24: [false, false, false, false, true, true, false, false],
  19: [false, false, false, false, false, false, false, false],
  8:  [false, false, false, false, false, false, false, false],
  1:  [false, false, false, false, false, false, false, false],
}

const statColumns = [
  { label: "Passing", cols: 3 },
  { label: "Hitting", cols: 3 },
  { label: "Setting", cols: 2 },
]

function ThumbButton({ up, active, color }: { up: boolean; active: boolean; color: string }) {
  return (
    <button
      className={`w-[48px] h-[48px] rounded-xl flex items-center justify-center transition-all ${
        active
          ? `bg-[${color}]/20 border-2 border-[${color}]/40`
          : "bg-white/[0.04] border border-white/[0.06] hover:border-white/10"
      }`}
      style={active ? { background: `${color}15`, borderColor: `${color}60` } : {}}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: up ? "none" : "rotate(180deg)" }}>
        <path
          d="M6 11h2.5l1-4.5a1 1 0 011-.5H13a1 1 0 011 1v4h2a1 1 0 01.9 1.4l-2 4.5a1 1 0 01-.9.6H7a1 1 0 01-1-1V11z"
          fill={active ? color : "rgba(255,255,255,0.15)"}
          stroke={active ? color : "rgba(255,255,255,0.15)"}
          strokeWidth="0.5"
        />
      </svg>
    </button>
  )
}

function EmptyStatCell() {
  return (
    <div className="w-[48px] h-[48px] rounded-xl bg-white/[0.03] border border-white/[0.06]" />
  )
}

export function T3StatTracking() {
  return (
    <div className="flex flex-col h-[740px] bg-[#0A1628] text-white overflow-hidden">

      {/* ====== MAIN SPLIT LAYOUT ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT PANEL: Mini Court (40%) ---- */}
        <div className="flex-[2] flex flex-col p-5 overflow-hidden">
          <p className="text-[10px] font-extrabold text-white/20 uppercase tracking-[0.15em] mb-3 shrink-0">Court View -- Tap to Select</p>

          <div className="flex-1 relative rounded-[20px] bg-white/[0.03] border border-white/[0.06] overflow-hidden min-h-0">
            {/* Net */}
            <div className="absolute left-0 right-0 top-[46%] flex items-center px-4">
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/40" />
              <span className="px-2 py-0.5 bg-[#2A9D8F]/80 text-[8px] font-extrabold text-white rounded tracking-widest">NET</span>
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/40" />
            </div>

            {/* Front row dots */}
            {[
              { num: 7, x: "22%", y: "22%", sel: true },
              { num: 8, x: "50%", y: "18%", sel: false },
              { num: 24, x: "78%", y: "22%", sel: false },
            ].map((p) => (
              <div key={p.num} className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
                <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center border-2 ${
                  p.sel ? "border-[#E9C46A] bg-[#E9C46A]/10" : "border-white/10 bg-white/5"
                }`}>
                  <span className="font-serif text-[22px] leading-none text-white">{p.num}</span>
                </div>
              </div>
            ))}

            {/* Back row dots */}
            {[
              { num: 19, x: "22%", y: "68%", sel: false },
              { num: 11, x: "50%", y: "75%", sel: false },
              { num: 1, x: "78%", y: "68%", sel: false },
            ].map((p) => (
              <div key={p.num} className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
                <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center border-2 ${
                  p.sel ? "border-[#E9C46A] bg-[#E9C46A]/10" : "border-white/10 bg-white/5"
                }`}>
                  <span className="font-serif text-[22px] leading-none text-white">{p.num}</span>
                </div>
              </div>
            ))}
          </div>

          {/* R3 badge */}
          <div className="flex items-center gap-2 mt-3 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-[#2A9D8F] text-[10px] font-extrabold tracking-wider text-white">R3</span>
            <span className="text-[10px] font-bold text-white/15">Tap a player to highlight for stat entry</span>
          </div>
        </div>

        {/* ---- RIGHT PANEL: Stat Tracking Grid (60%) ---- */}
        <div className="flex-[3] flex flex-col border-l border-white/[0.06] overflow-y-auto phone-scroll">
          {/* Column headers */}
          <div className="sticky top-0 z-10 bg-[#0A1628] border-b border-white/[0.06] shrink-0">
            <div className="flex items-end px-4 py-3">
              {/* Player col spacer */}
              <div className="w-[80px] shrink-0" />

              {/* Passing */}
              <div className="flex-1 text-center">
                <p className="font-serif text-[18px] text-white/60 tracking-wide">passing</p>
                <div className="w-full h-px bg-white/[0.06] mt-1" />
              </div>

              {/* Hitting */}
              <div className="flex-1 text-center">
                <p className="font-serif text-[18px] text-white/60 tracking-wide">hitting</p>
                <div className="w-full h-px bg-white/[0.06] mt-1" />
              </div>

              {/* Setting */}
              <div className="flex-[0.7] text-center">
                <p className="font-serif text-[18px] text-white/60 tracking-wide">setting</p>
                <div className="w-full h-px bg-white/[0.06] mt-1" />
              </div>

              {/* Point */}
              <div className="w-[110px] shrink-0 text-center">
                <p className="font-serif text-[18px] text-white/60 tracking-wide">point</p>
                <div className="w-full h-px bg-white/[0.06] mt-1" />
              </div>
            </div>
          </div>

          {/* Player rows */}
          {onCourtPlayers.map((p) => {
            const states = statStates[p.num] || Array(8).fill(false)
            return (
              <div key={p.num} className="border-b border-white/[0.04]">
                <div className="flex items-center px-4 py-3 gap-1">
                  {/* Player info */}
                  <div className="w-[80px] shrink-0 flex items-center gap-2">
                    <div className={`w-[48px] h-[48px] rounded-xl flex items-center justify-center border-2 ${
                      p.num === 7 ? "border-[#E9C46A] bg-[#E9C46A]/10" : "border-white/10 bg-white/5"
                    }`}>
                      <span className="font-serif text-[22px] leading-none text-white">{p.num}</span>
                    </div>
                  </div>

                  {/* Passing: thumbs up, thumbs down, empty */}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <ThumbButton up={true} active={states[0]} color="#2A9D8F" />
                    <ThumbButton up={false} active={states[1]} color="#E76F51" />
                    <EmptyStatCell />
                  </div>

                  {/* Hitting: thumbs up, thumbs down, empty */}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <ThumbButton up={true} active={states[2]} color="#2A9D8F" />
                    <ThumbButton up={false} active={states[3]} color="#E76F51" />
                    <EmptyStatCell />
                  </div>

                  {/* Setting: thumbs up, thumbs down */}
                  <div className="flex-[0.7] flex items-center justify-center gap-2">
                    <ThumbButton up={true} active={states[4]} color="#2A9D8F" />
                    <ThumbButton up={false} active={states[5]} color="#E76F51" />
                  </div>

                  {/* Point: check / X */}
                  <div className="w-[110px] shrink-0 flex items-center justify-center gap-2">
                    <button className={`w-[48px] h-[48px] rounded-xl flex items-center justify-center transition-all ${
                      states[6] ? "bg-[#22C55E]/20 border-2 border-[#22C55E]/40" : "bg-white/[0.04] border border-white/[0.06]"
                    }`}>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M5 11l4 4L17 7" stroke={states[6] ? "#22C55E" : "rgba(255,255,255,0.15)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className={`w-[48px] h-[48px] rounded-xl flex items-center justify-center transition-all ${
                      states[7] ? "bg-[#E76F51]/20 border-2 border-[#E76F51]/40" : "bg-white/[0.04] border border-white/[0.06]"
                    }`}>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M6 6l10 10M16 6L6 16" stroke={states[7] ? "#E76F51" : "rgba(255,255,255,0.15)"} strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Summary text */}
                {p.summary && (
                  <p className="px-4 pb-2 text-[10px] font-medium text-white/25 ml-[80px]">{p.summary}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ====== BOTTOM SCOREBOARD ====== */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0D1B3E] px-6 py-2.5">
        <div className="flex items-center justify-center gap-8">
          <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Black Hornets</p>
          <div className="flex items-center gap-4">
            <button className="w-[48px] h-[48px] rounded-2xl bg-[#2A9D8F]/20 border border-[#2A9D8F]/30 flex items-center justify-center text-[#2A9D8F]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </button>
            <p className="font-serif text-[44px] leading-none text-white tracking-wide">11</p>
            <span className="text-[10px] font-extrabold text-white/15 uppercase">Set 1</span>
            <p className="font-serif text-[44px] leading-none text-white tracking-wide">1</p>
            <button className="w-[48px] h-[48px] rounded-2xl bg-[#E76F51]/20 border border-[#E76F51]/30 flex items-center justify-center text-[#E76F51]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Frisco Flyers</p>
        </div>
      </div>
    </div>
  )
}
