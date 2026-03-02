"use client"

import { Bell, Home, Calendar, MessageCircle, MoreHorizontal, MapPin, CreditCard } from "lucide-react"

export function V2PhotoMagazine() {
  return (
    <div className="min-h-full bg-[#F6F8FB] text-[#0D1B3E]">
      {/* Dark Hero Section - Athlete Card (40% of screen) */}
      <div className="relative bg-gradient-to-b from-[#0D1B3E] via-[#10284C] to-[#162848] pt-[64px] px-6 pb-8" style={{ minHeight: '360px' }}>
        {/* Header over hero */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[22px] font-extrabold tracking-tight text-white">lynx</p>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-white/50 font-medium">Sarah</span>
            <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <Bell className="w-4 h-4 text-white/70" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#EF4444] rounded-full text-[8px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </div>

        {/* Athlete Hero */}
        <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#4BB9EC]/20 to-[#10284C]/50 border border-[#4BB9EC]/15 p-6">
          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[28px] font-extrabold border-2 border-[#4BB9EC]/40">
            1
          </div>
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC] mb-2">My Athlete</p>
          <h1 className="text-[42px] font-extrabold text-white leading-none mb-1">Ava</h1>
          <p className="text-[15px] text-white/60 font-semibold mb-1">Setter &middot; Black Hornets Elite</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[12px] text-white/50 font-medium">Season Active</span>
            </div>
            <span className="text-[12px] text-[#FFD700] font-bold">Lvl 4 Bronze</span>
          </div>
        </div>
      </div>

      {/* Editorial Content Flow */}
      <div className="px-6 -mt-2">
        {/* Next Event - Wide Card */}
        <div className="bg-white rounded-[20px] p-5 mb-4 shadow-[0_2px_20px_rgba(16,40,76,0.08)] border border-[#E8ECF2]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC] mb-1">Today &middot; 6:00 PM</p>
              <h3 className="text-[22px] font-extrabold text-[#10284C]">Practice</h3>
            </div>
            <div className="flex items-center gap-1.5 bg-[#22C55E]/10 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[11px] font-bold text-[#22C55E]">Today</span>
            </div>
          </div>
          <p className="text-[13px] text-[#10284C]/40 flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5" />
            Frisco Fieldhouse
          </p>
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 rounded-full bg-[#4BB9EC] text-[#10284C] text-[13px] font-bold">
              RSVP
            </button>
            <button className="flex-1 py-2.5 rounded-full bg-[#10284C]/5 text-[#10284C] text-[13px] font-semibold">
              Directions
            </button>
          </div>
        </div>

        {/* Two-column grid - Season + Balance */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Season */}
          <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#10284C]/30 mb-3">Record</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[32px] font-extrabold text-[#22C55E] leading-none">6</span>
              <span className="text-[14px] text-[#10284C]/30 font-bold">-</span>
              <span className="text-[32px] font-extrabold text-[#EF4444] leading-none">1</span>
            </div>
            <p className="text-[11px] text-[#10284C]/40 font-medium">Won 50-12 last</p>
          </div>

          {/* Balance */}
          <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#EF4444]/60 mb-3">Balance Due</p>
            <p className="text-[28px] font-extrabold text-[#10284C] leading-none mb-2">$209<span className="text-[18px] text-[#10284C]/40">.99</span></p>
            <button className="w-full py-2 rounded-full bg-[#4BB9EC] text-[#10284C] text-[11px] font-bold flex items-center justify-center gap-1">
              <CreditCard className="w-3 h-3" />
              Pay Now
            </button>
          </div>
        </div>

        {/* Team Social - Full width editorial */}
        <div className="bg-white rounded-[20px] p-5 mb-4 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#10284C]/30 mb-3">Team Hub</p>
          <div className="flex gap-3 items-start">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#D9994A]/20 flex items-center justify-center text-[22px] shrink-0">
              🎯
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#10284C] leading-snug">
                Coach Carlos gave Ava a <span className="text-[#4BB9EC] font-bold">Clutch Player</span> shoutout!
              </p>
              <p className="text-[11px] text-[#10284C]/30 mt-1.5">2 hours ago</p>
            </div>
          </div>
        </div>

        {/* XP / Engagement */}
        <div className="bg-white rounded-[20px] p-5 mb-4 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#10284C]/30">Progress</p>
            <span className="text-[11px] font-bold text-[#FFD700]">750 / 800 XP</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏅</span>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-[#10284C]">Level 4 Bronze</p>
              <div className="w-full h-1.5 bg-[#E8ECF2] rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-gradient-to-r from-[#4BB9EC] to-[#FFD700] rounded-full" style={{ width: '93.75%' }} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {['Iron Lung', 'Sniper', 'Team Spirit'].map((badge) => (
              <div key={badge} className="flex-1 bg-[#F6F8FB] rounded-xl py-2 px-2 text-center">
                <div className="w-8 h-8 mx-auto rounded-lg bg-[#4BB9EC]/10 flex items-center justify-center text-[14px] mb-1">🛡</div>
                <p className="text-[9px] font-semibold text-[#10284C]/50">{badge}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-[#10284C] rounded-[20px] p-4 px-5 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#4BB9EC]/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-[#4BB9EC]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">Team Chat</p>
            <p className="text-[11px] text-white/40 truncate">1 unread</p>
          </div>
          <span className="w-5 h-5 bg-[#4BB9EC] rounded-full text-[10px] font-bold text-[#10284C] flex items-center justify-center">1</span>
        </div>
      </div>

      <div className="h-24" />

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-[#E8ECF2] px-6 py-2 flex items-center justify-around">
        <NavItem icon={<Home className="w-5 h-5" />} label="Home" active />
        <NavItem icon={<Calendar className="w-5 h-5" />} label="Schedule" />
        <NavItem icon={<MessageCircle className="w-5 h-5" />} label="Chat" badge={7} />
        <NavItem icon={<MoreHorizontal className="w-5 h-5" />} label="More" badge={12} />
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, badge }: { icon: React.ReactNode; label: string; active?: boolean; badge?: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      <div className={active ? "text-[#4BB9EC]" : "text-[#10284C]/30"}>
        {icon}
      </div>
      <span className={`text-[10px] font-semibold ${active ? "text-[#4BB9EC]" : "text-[#10284C]/30"}`}>{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#EF4444] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  )
}
