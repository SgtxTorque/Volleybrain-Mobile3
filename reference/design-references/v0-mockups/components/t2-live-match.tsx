"use client"

/* ===================================================================
   T2: LIVE MATCH — SCORING & COURT VIEW
   Main game screen. Real-time scoring, rotation awareness, sub mgmt.
   Coach spends 90% of the match on this screen.
   2-panel + persistent bottom scoreboard
   =================================================================== */

const rotations = ["R1", "R2", "R3", "R4", "R5", "R6"]

const courtPlayers = {
  front: [
    { num: 7,  name: "Jade",   role: "OH", selected: true },
    { num: 8,  name: "Sophia", role: "S",  selected: false },
    { num: 24, name: "Payton", role: "OPP", selected: true },
  ],
  back: [
    { num: 19, name: "Mckenzie", role: "MB", selected: false },
    { num: 11, name: "Kira",     role: "OH", selected: true },
    { num: 1,  name: "Ashley",   role: "MB", selected: false },
  ],
}

const benchGrid = [
  { num: 10, name: "Kim" },
  { num: 14, name: "Ava" },
  { num: 23, name: "Mckayla" },
  { num: 6,  name: "Brianna" },
  { num: 18, name: "Toni" },
  { num: 3,  name: "Rachael" },
]

const subAlerts = [
  { inNum: 10, inName: "Kim",  outNum: 7,  outName: "Ashley", urgent: true },
  { inNum: 11, inName: "Toni", outNum: 3,  outName: "Rachael", urgent: false },
]

function CourtDot({ num, name, selected, x, y }: { num: number; name: string; selected: boolean; x: string; y: string }) {
  return (
    <div className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <div className={`w-[56px] h-[56px] rounded-full flex items-center justify-center border-2 transition-all ${
        selected ? "border-[#E9C46A] bg-[#E9C46A]/10" : "border-white/10 bg-white/5"
      }`}>
        <span className="font-serif text-[26px] leading-none text-white">{num}</span>
      </div>
      <span className="text-[8px] font-bold text-white/30 uppercase">{name}</span>
    </div>
  )
}

export function T2LiveMatch() {
  return (
    <div className="flex flex-col h-[740px] bg-[#0A1628] text-white overflow-hidden">

      {/* ====== MAIN 2-PANEL LAYOUT ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT PANEL: Court + Controls (60%) ---- */}
        <div className="flex-[3] flex flex-col p-5 overflow-hidden">
          {/* Top controls */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-[#2A9D8F] text-[11px] font-extrabold tracking-wider">R3</span>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">Rotation 3 of 6</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-5 py-2.5 rounded-xl bg-[#2A9D8F] text-[12px] font-extrabold text-white min-h-[44px]">
                Serve
              </button>
              <button className="px-5 py-2.5 rounded-xl bg-[#4BB9EC] text-[12px] font-extrabold text-white min-h-[44px]">
                Serve Receive
              </button>
            </div>
          </div>

          {/* Court view */}
          <div className="flex-1 relative rounded-[20px] bg-white/[0.03] border border-white/[0.06] overflow-hidden min-h-0">
            {/* Net */}
            <div className="absolute left-0 right-0 top-[46%] flex items-center px-4">
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/40" />
              <span className="px-3 py-1 bg-[#2A9D8F]/80 text-[9px] font-extrabold text-white rounded-md tracking-widest">NET</span>
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/40" />
            </div>

            {/* Front/Back labels */}
            <p className="absolute top-3 right-4 text-[8px] font-bold text-white/10 uppercase tracking-wider">Front</p>
            <p className="absolute bottom-3 right-4 text-[8px] font-bold text-white/10 uppercase tracking-wider">Back</p>

            {/* Front row */}
            <CourtDot num={courtPlayers.front[0].num} name={courtPlayers.front[0].name} selected={courtPlayers.front[0].selected} x="22%" y="22%" />
            <CourtDot num={courtPlayers.front[1].num} name={courtPlayers.front[1].name} selected={courtPlayers.front[1].selected} x="50%" y="18%" />
            <CourtDot num={courtPlayers.front[2].num} name={courtPlayers.front[2].name} selected={courtPlayers.front[2].selected} x="78%" y="22%" />

            {/* Back row */}
            <CourtDot num={courtPlayers.back[0].num} name={courtPlayers.back[0].name} selected={courtPlayers.back[0].selected} x="22%" y="68%" />
            <CourtDot num={courtPlayers.back[1].num} name={courtPlayers.back[1].name} selected={courtPlayers.back[1].selected} x="50%" y="75%" />
            <CourtDot num={courtPlayers.back[2].num} name={courtPlayers.back[2].name} selected={courtPlayers.back[2].selected} x="78%" y="68%" />
          </div>

          {/* Rotation pills */}
          <div className="flex items-center gap-2 mt-3 shrink-0">
            {rotations.map((r) => (
              <button
                key={r}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all min-h-[36px] ${
                  r === "R3"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/20"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ---- RIGHT PANEL: Subs + Alerts (40%) ---- */}
        <div className="flex-[2] flex flex-col p-5 border-l border-white/[0.06] overflow-y-auto phone-scroll">
          {/* Subs header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-[0.12em]">Subs (2/12)</p>
          </div>

          {/* Bench grid: 3 cols */}
          <div className="grid grid-cols-3 gap-2 mb-5 shrink-0">
            {benchGrid.map((p) => (
              <button
                key={p.num}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#2A9D8F]/30 transition-all min-h-[56px]"
              >
                <div className="w-[44px] h-[44px] rounded-full bg-gradient-to-b from-white/10 to-white/5 flex items-center justify-center">
                  <span className="font-serif text-[22px] leading-none text-white">{p.num}</span>
                </div>
                <p className="text-[8px] font-bold text-white/25 uppercase">{p.name}</p>
              </button>
            ))}
          </div>

          {/* ALERT section */}
          <p className="text-[9px] font-extrabold text-[#E9C46A]/50 uppercase tracking-[0.15em] mb-2 shrink-0">Sub Alerts</p>
          <div className="flex flex-col gap-2 mb-5">
            {subAlerts.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  s.urgent
                    ? "bg-[#E9C46A]/5 border-[#E9C46A]/30"
                    : "bg-white/[0.02] border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-serif text-[18px] text-[#2A9D8F]">{s.inNum}</span>
                  <span className="text-[10px] font-bold text-white/30 truncate">{s.inName}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M4 8h8M9 5l3 3-3 3" stroke="#4BB9EC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-serif text-[18px] text-[#E76F51]">{s.outNum}</span>
                  <span className="text-[10px] font-bold text-white/30 truncate">{s.outName}</span>
                </div>
                {s.urgent && (
                  <span className="text-[8px] font-extrabold text-[#E9C46A] bg-[#E9C46A]/10 px-2 py-1 rounded-md tracking-wider shrink-0">NOW</span>
                )}
              </div>
            ))}
          </div>

          {/* Confirm Sub button */}
          <button className="w-full py-3 rounded-xl bg-[#2A9D8F] text-[12px] font-extrabold text-white tracking-wide min-h-[48px] mb-4 shrink-0">
            Confirm Sub
          </button>

          {/* Set history */}
          <div className="mt-auto shrink-0">
            <p className="text-[9px] font-bold text-white/15 uppercase tracking-wider mb-2">Set History</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 text-[11px] font-bold text-[#2A9D8F]">25-18</span>
              <span className="px-3 py-1.5 rounded-lg bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 text-[11px] font-bold text-[#2A9D8F]">25-21</span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== BOTTOM BAR: SCOREBOARD (always visible) ====== */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0D1B3E] px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left team */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button className="w-[56px] h-[56px] rounded-2xl bg-[#2A9D8F]/20 border border-[#2A9D8F]/30 flex items-center justify-center text-[#2A9D8F]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
              <div className="text-center">
                <p className="font-serif text-[52px] leading-none text-white tracking-wide">11</p>
              </div>
              <button className="w-[36px] h-[36px] rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Black Hornets</p>
          </div>

          {/* Center: set info + undo */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-extrabold text-white/20 uppercase tracking-widest">Set 1</span>
            <button className="text-white/15 hover:text-white/30 transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9a5 5 0 019-3M14 9a5 5 0 01-9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M4 6V9H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>

          {/* Right team */}
          <div className="flex items-center gap-4">
            <p className="text-[11px] font-extrabold text-white/30 uppercase tracking-wider">Frisco Flyers</p>
            <div className="flex items-center gap-3">
              <button className="w-[36px] h-[36px] rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <div className="text-center">
                <p className="font-serif text-[52px] leading-none text-white tracking-wide">1</p>
              </div>
              <button className="w-[56px] h-[56px] rounded-2xl bg-[#E76F51]/20 border border-[#E76F51]/30 flex items-center justify-center text-[#E76F51]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* Far right controls */}
          <div className="flex flex-col gap-2">
            <button className="px-4 py-2.5 rounded-xl bg-[#E9C46A] text-[11px] font-extrabold text-[#0A1628] min-h-[40px]">
              Show Rotation
            </button>
            <button className="px-4 py-2.5 rounded-xl bg-[#E76F51] text-[11px] font-extrabold text-white min-h-[40px]">
              End Set/Match
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
