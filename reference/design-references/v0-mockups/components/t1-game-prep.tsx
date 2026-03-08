"use client"

/* ===================================================================
   T1: GAME PREP / LINEUP BUILDER
   Pre-match lineup screen. Coach assigns players to court positions,
   picks formation, reviews rotations, assigns subs and libero.
   3-column layout: Formation+Rotation | Court | Bench+Subs
   =================================================================== */

const formations = ["5-1", "6-2", "6-6"]
const rotations = ["R1", "R2", "R3", "R4", "R5", "R6"]

// 6 starters in current rotation — front row above net, back row below
const courtPlayers = {
  frontRow: [
    { num: 19, name: "Mckenzie", role: "MB", bg: "bg-[#1C2D50]", selected: true },
    { num: 8,  name: "Sophia",   role: "S",  bg: "bg-[#10284C]", selected: false },
    { num: 24, name: "Payton",   role: "OPP", bg: "bg-[#1C2D50]", selected: false },
  ],
  backRow: [
    { num: 7,  name: "Jade",     role: "OH", bg: "bg-[#1C2D50]", selected: false },
    { num: 11, name: "Kira",     role: "OH", bg: "bg-[#0D1B3E]", selected: true },
    { num: 1,  name: "Ashley",   role: "MB", bg: "bg-[#0D1B3E]", selected: false },
  ],
}

const benchPlayers = [
  { num: 10, name: "Kim" },
  { num: 14, name: "Ava" },
  { num: 23, name: "Mckayla" },
  { num: 6,  name: "Brianna" },
  { num: 18, name: "Toni" },
  { num: 3,  name: "Rachael" },
]

const subPairs = [
  { inNum: 10, inName: "Kim",  outNum: 7,  outName: "Ashley" },
  { inNum: 11, inName: "Toni", outNum: 3,  outName: "Rachael" },
]

const roleBadgeColor: Record<string, string> = {
  OH:  "#4BB9EC",
  MB:  "#E76F51",
  S:   "#E9C46A",
  OPP: "#2A9D8F",
  L:   "#FFD700",
}

function PlayerCard({ num, name, role, selected }: { num: number; name: string; role: string; selected: boolean }) {
  const borderColor = selected ? "border-[#E9C46A]" : "border-white/10"
  return (
    <div className={`relative flex flex-col items-center gap-1 rounded-[14px] border-2 ${borderColor} bg-white/5 backdrop-blur-sm p-2 w-[110px] transition-all`}>
      {/* Photo placeholder */}
      <div className="w-[72px] h-[72px] rounded-lg bg-gradient-to-b from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="14" r="8" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="20" cy="36" rx="14" ry="10" fill="rgba(255,255,255,0.1)" />
        </svg>
      </div>
      {/* Jersey number */}
      <p className="font-serif text-[28px] leading-none text-white tracking-wide">{num}</p>
      {/* Name */}
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate max-w-full">{name}</p>
      {/* Role badge */}
      <span
        className="absolute top-1.5 right-1.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md"
        style={{ background: `${roleBadgeColor[role] || "#4BB9EC"}20`, color: roleBadgeColor[role] || "#4BB9EC" }}
      >
        {role}
      </span>
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E9C46A] flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#0A1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  )
}

export function T1GamePrep() {
  return (
    <div className="flex flex-col h-[740px] bg-[#0A1628] text-white overflow-hidden">
      {/* ====== TOP BAR ====== */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-white/30">vs</span>
          <span className="text-[14px] font-extrabold text-white">Frisco Flyers</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-[#E76F51] text-[12px] font-extrabold text-white tracking-wide">
            WE SERVE FIRST
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 rounded-xl bg-[#2A9D8F] text-[13px] font-extrabold text-white tracking-wide min-h-[44px]">
            Start Match
          </button>
          <button className="px-5 py-2.5 rounded-xl border border-white/10 text-[12px] font-bold text-white/40 min-h-[44px]">
            Return to Match
          </button>
        </div>
      </div>

      {/* ====== MAIN 3-COLUMN LAYOUT ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- LEFT SIDEBAR: Formation + Rotation + Phase ---- */}
        <div className="w-[140px] shrink-0 flex flex-col gap-5 p-4 border-r border-white/[0.06]">
          {/* Formation */}
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] mb-2">Formation</p>
            <div className="flex flex-col gap-2">
              {formations.map((f) => (
                <button
                  key={f}
                  className={`w-full py-2.5 rounded-xl text-[14px] font-extrabold tracking-wide transition-all min-h-[44px] ${
                    f === "6-2"
                      ? "bg-[#2A9D8F] text-white"
                      : "border border-white/10 text-white/30 hover:border-[#2A9D8F]/30"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation */}
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] mb-2">Rotation</p>
            <div className="flex flex-col gap-1.5">
              {rotations.map((r) => (
                <button
                  key={r}
                  className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all min-h-[40px] ${
                    r === "R4"
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:border-[#2A9D8F]/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Phase */}
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] mb-2">Phase</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Base", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11V5l5-3.5L12 5v6a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.2"/></svg> },
                { label: "Serve", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 7c0-1.5 1.5-3 3-3" stroke="currentColor" strokeWidth="1.2"/></svg> },
                { label: "Receive", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M3 11V3h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              ].map((p, i) => (
                <button
                  key={p.label}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all min-h-[40px] ${
                    i === 0
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-white/[0.03] border border-white/[0.06] text-white/30"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Libero */}
          <div className="mt-auto">
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] mb-2">Libero</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#E9C46A]/10 border border-[#E9C46A]/20">
              <span className="font-serif text-[22px] leading-none text-[#E9C46A]">3</span>
              <span className="text-[10px] font-bold text-[#E9C46A]/60">Rachael</span>
            </div>
          </div>
        </div>

        {/* ---- CENTER: THE COURT ---- */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-[660px] aspect-[1.4/1] rounded-[24px] bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
            {/* NET line */}
            <div className="absolute left-0 right-0 top-[46%] flex items-center px-6">
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/50" />
              <span className="px-4 py-1 bg-[#2A9D8F] text-[10px] font-extrabold text-white rounded-md tracking-widest">NET</span>
              <div className="flex-1 border-t-2 border-dashed border-[#2A9D8F]/50" />
            </div>

            {/* Front Row label */}
            <p className="absolute top-4 left-6 text-[8px] font-bold text-white/15 uppercase tracking-[0.15em]">Front Row</p>
            {/* Back Row label */}
            <p className="absolute bottom-4 left-6 text-[8px] font-bold text-white/15 uppercase tracking-[0.15em]">Back Row</p>

            {/* Front row players -- positioned above net */}
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2 flex items-end gap-6">
              {courtPlayers.frontRow.map((p) => (
                <PlayerCard key={p.num} num={p.num} name={p.name} role={p.role} selected={p.selected} />
              ))}
            </div>

            {/* Back row players -- positioned below net */}
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 flex items-start gap-6">
              {courtPlayers.backRow.map((p) => (
                <PlayerCard key={p.num} num={p.num} name={p.name} role={p.role} selected={p.selected} />
              ))}
            </div>

            {/* Serve indicator */}
            <div className="absolute bottom-4 right-6 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.2" opacity="0.3" />
                <path d="M5 9c0-2 2-4 4-4" stroke="white" strokeWidth="1.2" opacity="0.3" />
                <path d="M9 5c2 0 4 2 4 4" stroke="white" strokeWidth="1.2" opacity="0.3" />
              </svg>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider">OUR SERVE</span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between w-full max-w-[660px] mt-4">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E9C46A]/10 border border-[#E9C46A]/20 text-[11px] font-bold text-[#E9C46A] min-h-[40px]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M1.5 7a5.5 5.5 0 1011 0 5.5 5.5 0 10-11 0" stroke="currentColor" strokeWidth="1.2"/></svg>
                Auto-Fill
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-[11px] font-bold text-white/25 min-h-[40px]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M3 11l8-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Clear
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-bold text-white/25 min-h-[40px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
              Rotation Preview
            </button>
          </div>
        </div>

        {/* ---- RIGHT SIDEBAR: Bench + Sub Pairs ---- */}
        <div className="w-[200px] shrink-0 flex flex-col p-4 border-l border-white/[0.06] overflow-y-auto phone-scroll">
          <p className="text-[10px] font-extrabold text-white/25 uppercase tracking-[0.15em] mb-3">Subs ({benchPlayers.length})</p>

          {/* Bench grid: 2 columns */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {benchPlayers.map((p) => (
              <div
                key={p.num}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#2A9D8F]/30 transition-colors cursor-pointer"
              >
                <div className="w-[48px] h-[48px] rounded-lg bg-gradient-to-b from-white/10 to-white/5 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="9" r="5" fill="rgba(255,255,255,0.12)" />
                    <ellipse cx="12" cy="22" rx="8" ry="6" fill="rgba(255,255,255,0.08)" />
                  </svg>
                </div>
                <p className="font-serif text-[20px] leading-none text-white">{p.num}</p>
                <p className="text-[8px] font-bold text-white/30 uppercase truncate">{p.name}</p>
              </div>
            ))}
          </div>

          {/* Sub pairs */}
          <p className="text-[9px] font-extrabold text-white/20 uppercase tracking-[0.15em] mb-2">Sub Pairs</p>
          <div className="flex flex-col gap-2">
            {subPairs.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] font-bold text-[#2A9D8F]">#{s.inNum}</span>
                <span className="text-[9px] text-white/20">{s.inName}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="#4BB9EC" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[11px] font-bold text-[#E76F51]">#{s.outNum}</span>
                <span className="text-[9px] text-white/20">{s.outName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
