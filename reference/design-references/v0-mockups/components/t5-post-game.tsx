"use client"

/* ===================================================================
   T5: END SET / POST-GAME SUMMARY
   Set/match recap with result, score, and stats breakdown.
   Left: celebration + result | Right: stats + performers
   =================================================================== */

const teamStats = [
  { label: "Kills",         home: 38, away: 22, max: 50 },
  { label: "Errors",        home: 12, away: 18, max: 25 },
  { label: "Aces",          home: 8,  away: 3,  max: 15 },
  { label: "Serve Errors",  home: 5,  away: 9,  max: 15 },
  { label: "Assists",       home: 32, away: 18, max: 40 },
  { label: "Blocks",        home: 6,  away: 4,  max: 12 },
  { label: "Digs",          home: 28, away: 20, max: 40 },
]

const topPerformers = [
  { title: "MVP",          num: 11, name: "Kira",     stat: "14 Kills, 3 Aces",  color: "#E9C46A" },
  { title: "Top Server",   num: 1,  name: "Ashley",   stat: "5 Aces, 0 Errors",  color: "#2A9D8F" },
  { title: "Top Defender",  num: 7,  name: "Jade",     stat: "12 Digs",           color: "#4BB9EC" },
]

export function T5PostGame() {
  return (
    <div className="flex flex-col h-[740px] bg-[#0A1628] text-white overflow-hidden">

      {/* ====== MAIN 2-PANEL ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT: Result + Celebration (40%) ---- */}
        <div className="flex-[2] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A9D8F]/10 to-transparent" />

          {/* WIN badge */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-[120px] h-[120px] rounded-full bg-[#2A9D8F]/15 border-4 border-[#2A9D8F]/40 flex items-center justify-center mb-6">
              <span className="font-serif text-[42px] leading-none text-[#2A9D8F] tracking-wider">WIN</span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 mb-4">
              <p className="font-serif text-[80px] leading-none text-white tracking-wider">50</p>
              <span className="font-serif text-[40px] leading-none text-white/20">--</span>
              <p className="font-serif text-[80px] leading-none text-white/40 tracking-wider">12</p>
            </div>

            {/* Match result */}
            <p className="text-[16px] font-extrabold text-[#2A9D8F] mb-2">Won 2-0</p>

            {/* Set pills */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-lg bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 text-[13px] font-bold text-[#2A9D8F]">25-18</span>
              <span className="px-4 py-1.5 rounded-lg bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 text-[13px] font-bold text-[#2A9D8F]">25-21</span>
            </div>

            {/* Teams */}
            <p className="text-[12px] font-bold text-white/30 mb-1">Black Hornets vs Frisco Flyers</p>
            <p className="text-[11px] font-medium text-white/15">March 5, 2026 -- 4:30 PM</p>

            {/* Sub usage summary */}
            <div className="mt-6 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1">Match Summary</p>
              <p className="text-[11px] text-white/30">4 substitutions used -- 12 available</p>
              <p className="text-[11px] text-white/30">2 timeouts used -- 4 available</p>
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Stats (60%) ---- */}
        <div className="flex-[3] flex flex-col p-6 border-l border-white/[0.06] overflow-y-auto phone-scroll">

          {/* Top Performers */}
          <p className="text-[10px] font-extrabold text-[#E9C46A]/50 uppercase tracking-[0.15em] mb-3 shrink-0">Top Performers</p>
          <div className="flex gap-3 mb-6 shrink-0">
            {topPerformers.map((p) => (
              <div key={p.title} className="flex-1 rounded-[16px] bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col items-center">
                {/* Photo placeholder */}
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center border-2 mb-2"
                  style={{ borderColor: `${p.color}50`, background: `${p.color}10` }}
                >
                  <span className="font-serif text-[26px] leading-none text-white">{p.num}</span>
                </div>

                {/* Title badge */}
                <span
                  className="text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2"
                  style={{ background: `${p.color}15`, color: p.color }}
                >
                  {p.title}
                </span>

                <p className="text-[13px] font-bold text-white/80 mb-0.5">{p.name}</p>
                <p className="text-[10px] font-medium text-white/30 text-center">{p.stat}</p>
              </div>
            ))}
          </div>

          {/* Team Stats with power bars */}
          <p className="text-[10px] font-extrabold text-white/20 uppercase tracking-[0.15em] mb-3 shrink-0">Team Stats Comparison</p>
          <div className="flex flex-col gap-3">
            {teamStats.map((s) => {
              const homeWidth = Math.max((s.home / s.max) * 100, 8)
              const awayWidth = Math.max((s.away / s.max) * 100, 8)
              const homeWins = s.label === "Errors" || s.label === "Serve Errors"
                ? s.home < s.away
                : s.home > s.away
              return (
                <div key={s.label} className="flex items-center gap-4">
                  {/* Home value */}
                  <span className={`w-[28px] text-right font-serif text-[18px] leading-none ${
                    homeWins ? "text-[#2A9D8F]" : "text-white/40"
                  }`}>
                    {s.home}
                  </span>

                  {/* Home bar (grows right-to-left) */}
                  <div className="flex-1 flex justify-end">
                    <div className="w-full h-[8px] rounded-full bg-white/[0.04] overflow-hidden flex justify-end">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${homeWidth}%`,
                          background: homeWins ? "#2A9D8F" : "rgba(255,255,255,0.1)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Label */}
                  <span className="w-[90px] text-center text-[10px] font-bold text-white/25 uppercase tracking-wider shrink-0">
                    {s.label}
                  </span>

                  {/* Away bar (grows left-to-right) */}
                  <div className="flex-1">
                    <div className="w-full h-[8px] rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${awayWidth}%`,
                          background: !homeWins ? "#E76F51" : "rgba(255,255,255,0.1)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Away value */}
                  <span className={`w-[28px] font-serif text-[18px] leading-none ${
                    !homeWins ? "text-[#E76F51]" : "text-white/40"
                  }`}>
                    {s.away}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[20px]" />
        </div>
      </div>

      {/* ====== BOTTOM ACTION BAR ====== */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0D1B3E] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="px-6 py-3 rounded-xl bg-[#2A9D8F] text-[13px] font-extrabold text-white tracking-wide min-h-[48px]">
              Save & Finish
            </button>
            <button className="px-5 py-3 rounded-xl border border-white/[0.06] text-[12px] font-bold text-white/30 min-h-[48px]">
              Share Recap
            </button>
          </div>
          <button className="px-5 py-3 rounded-xl bg-[#4BB9EC]/20 border border-[#4BB9EC]/30 text-[12px] font-bold text-[#4BB9EC] min-h-[48px]">
            Start Next Set
          </button>
        </div>
      </div>
    </div>
  )
}
