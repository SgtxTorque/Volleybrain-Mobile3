"use client"

/* ===================================================================
   T4: SERVE TRACKING OVERLAY
   When our team serves, coach taps WHERE the serve landed on the
   opponent's court. Long-press for an ace. Shows serve heat map,
   server info, and current stats. This is a modal overlay on T2.
   Left: server info | Right: opponent court tap map
   =================================================================== */

// Previous serve locations for heat-map effect
const serveLocations = [
  { x: 30, y: 25, type: "ace" },
  { x: 65, y: 35, type: "good" },
  { x: 45, y: 60, type: "good" },
  { x: 80, y: 45, type: "good" },
  { x: 20, y: 70, type: "ace" },
  { x: 55, y: 20, type: "error" },
  { x: 90, y: 80, type: "error" },
  { x: 70, y: 55, type: "error" },
]

export function T4ServeTracking() {
  return (
    <div className="flex flex-col h-[740px] bg-[#0A1628] text-white overflow-hidden">

      {/* Overlay header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold text-[#E9C46A] uppercase tracking-[0.15em]">Serve Tracking</span>
          <span className="text-[10px] font-bold text-white/15">|</span>
          <span className="text-[10px] font-bold text-white/20">OUR SERVE -- R3</span>
        </div>
        <button className="px-5 py-2 rounded-xl border border-white/[0.06] text-[11px] font-bold text-white/30 min-h-[40px]">
          Done
        </button>
      </div>

      {/* ====== MAIN 2-PANEL ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT: Server Info (30%) ---- */}
        <div className="w-[300px] shrink-0 flex flex-col items-center justify-center p-8 border-r border-white/[0.06]">
          {/* Player photo */}
          <div className="w-[120px] h-[120px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border-2 border-[#E9C46A]/30 flex items-center justify-center mb-4 overflow-hidden">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="20" r="12" fill="rgba(255,255,255,0.12)" />
              <ellipse cx="30" cy="50" rx="20" ry="14" fill="rgba(255,255,255,0.08)" />
            </svg>
          </div>

          {/* Jersey number */}
          <p className="font-serif text-[72px] leading-none text-white tracking-wider mb-1">1</p>

          {/* Name */}
          <p className="text-[14px] font-bold text-white/60 mb-6">Ashley</p>

          {/* Serve stats */}
          <div className="w-full flex flex-col gap-3">
            {/* Aces */}
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-xl bg-[#E9C46A]/10 border border-[#E9C46A]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L9 12.7 4.8 15l.8-4.7L2.2 7l4.7-.7L9 2z" fill="#E9C46A" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-[#E9C46A]">2 Aces</p>
                <div className="w-full h-[4px] rounded-full bg-white/[0.06] mt-1">
                  <div className="h-full rounded-full bg-[#E9C46A]" style={{ width: "25%" }} />
                </div>
              </div>
            </div>

            {/* Good serves */}
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="4" fill="none" stroke="#2A9D8F" strokeWidth="1.5" />
                  <circle cx="9" cy="9" r="1.5" fill="#2A9D8F" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-[#2A9D8F]">3 Good Serves</p>
                <div className="w-full h-[4px] rounded-full bg-white/[0.06] mt-1">
                  <div className="h-full rounded-full bg-[#2A9D8F]" style={{ width: "37.5%" }} />
                </div>
              </div>
            </div>

            {/* Serve errors */}
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-xl bg-[#E76F51]/10 border border-[#E76F51]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M5 5l8 8M13 5l-8 8" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-[#E76F51]">3 Serve Errors</p>
                <div className="w-full h-[4px] rounded-full bg-white/[0.06] mt-1">
                  <div className="h-full rounded-full bg-[#E76F51]" style={{ width: "37.5%" }} />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/25">Total: 8 serves this set</p>
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Opponent Court Tap Map (70%) ---- */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-[10px] font-extrabold text-white/15 uppercase tracking-[0.15em] mb-3">Tap where serve landed on opponent{"\'"}s court</p>

          <div className="relative w-full max-w-[640px] aspect-[1.5/1]">
            {/* Court boundary -- red/coral outer border */}
            <div className="absolute inset-0 rounded-[4px] border-[3px] border-[#E76F51] bg-[#2A9D8F]/15">
              {/* Attack line -- dashed */}
              <div className="absolute left-0 right-0 top-[45%] border-t-2 border-dashed border-white/20" />

              {/* Grid faint lines for zones */}
              <div className="absolute left-[33%] top-0 bottom-0 border-l border-white/[0.04]" />
              <div className="absolute left-[66%] top-0 bottom-0 border-l border-white/[0.04]" />

              {/* Serve location markers */}
              {serveLocations.map((s, i) => (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                >
                  {s.type === "ace" ? (
                    <div className="w-[32px] h-[32px] flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l2.9 5.8 6.4 1-4.6 4.5 1.1 6.4L12 16.8l-5.8 3 1.1-6.4L2.7 8.8l6.4-1L12 2z" fill="#E9C46A" opacity="0.9" />
                      </svg>
                    </div>
                  ) : s.type === "good" ? (
                    <div className="w-[24px] h-[24px] rounded-full border-2 border-[#2A9D8F] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="2" fill="none" stroke="#2A9D8F" strokeWidth="1.5" />
                        <line x1="6" y1="0" x2="6" y2="3" stroke="#2A9D8F" strokeWidth="1" />
                        <line x1="6" y1="9" x2="6" y2="12" stroke="#2A9D8F" strokeWidth="1" />
                        <line x1="0" y1="6" x2="3" y2="6" stroke="#2A9D8F" strokeWidth="1" />
                        <line x1="9" y1="6" x2="12" y2="6" stroke="#2A9D8F" strokeWidth="1" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="#E76F51" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {/* "Out" indicators on edges */}
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#E76F51]/50 uppercase tracking-wider">Out (error)</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/15 uppercase tracking-wider">Court boundary</span>
            </div>

            {/* NET at bottom */}
            <div className="absolute -bottom-2 left-0 right-0 flex items-center">
              <div className="flex-1 border-t-[3px] border-white/30" />
              <span className="px-3 py-1 bg-white/10 text-[9px] font-extrabold text-white/50 rounded tracking-widest">NET</span>
              <div className="flex-1 border-t-[3px] border-white/30" />
            </div>

            {/* Error X on net */}
            <div className="absolute -bottom-1 right-[15%]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="#E76F51" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.1 3.4 12l.7-4L1.2 5.2l4-.6L7 1z" fill="#E9C46A" /></svg>
              <span className="text-[10px] font-bold text-white/25">Ace (long-press)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-[#2A9D8F]" />
              <span className="text-[10px] font-bold text-white/25">Good serve (tap in court)</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#E76F51" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="text-[10px] font-bold text-white/25">Error (tap outside / net)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== BOTTOM SCOREBOARD ====== */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0D1B3E] px-6 py-2.5">
        <div className="flex items-center justify-center gap-8">
          <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Black Hornets</p>
          <div className="flex items-center gap-4">
            <p className="font-serif text-[44px] leading-none text-white tracking-wide">11</p>
            <span className="text-[10px] font-extrabold text-white/15 uppercase">Set 1</span>
            <p className="font-serif text-[44px] leading-none text-white tracking-wide">1</p>
          </div>
          <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Frisco Flyers</p>
        </div>
      </div>
    </div>
  )
}
