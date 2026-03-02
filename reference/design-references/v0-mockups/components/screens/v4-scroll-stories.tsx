"use client"

import { Home, Calendar, MessageCircle, MoreHorizontal, MapPin, ArrowRight, Bell } from "lucide-react"

export function V4ScrollStories() {
  return (
    <div className="min-h-full bg-[#F6F8FB] text-[#0D1B3E]">
      {/* Minimal Header */}
      <div className="fixed top-0 left-0 right-0 z-40 pt-[64px] px-6 pb-3 bg-[#F6F8FB]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <p className="text-[20px] font-extrabold tracking-tight text-[#10284C]">lynx</p>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#10284C]/50">Sarah</span>
            <button className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E8ECF2]">
              <Bell className="w-3.5 h-3.5 text-[#10284C]" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#EF4444] rounded-full text-[7px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-[110px] px-4 flex flex-col gap-4">
        {/* Card 1: Event - Full Bleed Hero */}
        <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-b from-[#10284C] to-[#0D1B3E] min-h-[280px] flex flex-col justify-end p-6">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-6 right-6 w-32 h-32 rounded-full bg-[#4BB9EC]/30 blur-3xl" />
            <div className="absolute bottom-10 left-6 w-24 h-24 rounded-full bg-[#FFD700]/20 blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC]">Up Next</p>
            </div>
            <h2 className="text-[36px] font-extrabold text-white leading-none mb-1">Practice</h2>
            <p className="text-[16px] text-white/60 font-semibold mb-1">Today at 6:00 PM</p>
            <p className="text-[13px] text-white/35 flex items-center gap-1.5 mb-5">
              <MapPin className="w-3.5 h-3.5" />
              Frisco Fieldhouse
            </p>
            <button className="w-full py-3 rounded-full bg-[#4BB9EC] text-[#10284C] text-[14px] font-bold flex items-center justify-center gap-2">
              RSVP Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Athlete Card */}
        <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#4BB9EC]/10 to-white min-h-[200px] flex flex-col justify-end p-6 border border-[#4BB9EC]/15">
          <div className="absolute top-5 right-5 w-16 h-16 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[24px] font-extrabold shadow-lg">
            1
          </div>
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC] mb-1">My Athlete</p>
          <h2 className="text-[36px] font-extrabold text-[#10284C] leading-none mb-1">Ava</h2>
          <p className="text-[15px] text-[#10284C]/50 font-semibold">Black Hornets Elite &middot; Setter</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[11px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full">Level 4 Bronze</span>
            <span className="text-[11px] text-[#10284C]/40 font-medium">750/800 XP</span>
          </div>
        </div>

        {/* Card 3: Game Recap */}
        <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-b from-[#22C55E]/10 to-white min-h-[180px] flex flex-col p-6 border border-[#22C55E]/15">
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#22C55E] mb-3">Latest Game</p>
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="text-center">
              <p className="text-[48px] font-extrabold text-[#10284C] leading-none">50</p>
              <p className="text-[12px] text-[#10284C]/40 font-semibold mt-1">Hornets</p>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[12px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-3 py-0.5 rounded-full mb-1">WIN</span>
              <span className="text-[11px] text-[#10284C]/30">vs</span>
            </div>
            <div className="text-center">
              <p className="text-[48px] font-extrabold text-[#10284C]/30 leading-none">12</p>
              <p className="text-[12px] text-[#10284C]/25 font-semibold mt-1">Opponent</p>
            </div>
          </div>
          <p className="text-[12px] text-[#10284C]/40 font-medium text-center">Season Record: 6W - 1L</p>
        </div>

        {/* Card 4: Team Shoutout */}
        <div className="relative rounded-[24px] overflow-hidden bg-white min-h-[140px] p-6 border border-[#E8ECF2]">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center text-[24px] shrink-0">🎯</div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#10284C]/30 mb-1">Team Hub</p>
              <p className="text-[16px] font-bold text-[#10284C] leading-snug">
                Coach Carlos gave Ava a <span className="text-[#4BB9EC]">Clutch Player</span> shoutout!
              </p>
              <p className="text-[12px] text-[#10284C]/30 mt-2">2 hours ago</p>
            </div>
          </div>
        </div>

        {/* Card 5: Balance */}
        <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#EF4444]/5 to-white p-6 border border-[#EF4444]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#EF4444]/60 mb-1">Outstanding Balance</p>
              <p className="text-[32px] font-extrabold text-[#10284C] leading-none">$209.99</p>
            </div>
            <button className="px-5 py-2.5 rounded-full bg-[#4BB9EC] text-[#10284C] text-[13px] font-bold flex items-center gap-1.5">
              Pay
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 6: Chat */}
        <div className="relative rounded-[24px] overflow-hidden bg-[#10284C] p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#4BB9EC]/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-[#4BB9EC]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white truncate">Black Hornets Elite</p>
            <p className="text-[12px] text-white/40 truncate">1 unread message</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
        </div>
      </div>

      <div className="h-24" />

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-[#F6F8FB]/90 backdrop-blur-xl border-t border-[#E8ECF2] px-6 py-2 flex items-center justify-around">
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
