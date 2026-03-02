"use client"

import { Bell, Home, Calendar, MessageCircle, MoreHorizontal, MapPin, ChevronRight } from "lucide-react"

export function V1AiryWelcome() {
  return (
    <div className="min-h-full bg-[#F6F8FB] text-[#0D1B3E]">
      {/* Header */}
      <div className="pt-[64px] px-6 pb-4 bg-[#F6F8FB]">
        <div className="flex items-center justify-between mb-8">
          <p className="text-[22px] font-extrabold tracking-tight text-[#10284C]">lynx</p>
          <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E8ECF2]">
            <Bell className="w-[18px] h-[18px] text-[#10284C]" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] font-bold text-white flex items-center justify-center">3</span>
          </button>
        </div>

        {/* Welcome with mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#E8F4FD] flex items-center justify-center mb-4 border-2 border-[#4BB9EC]/20">
            <span className="text-4xl">🐱</span>
          </div>
          <p className="text-[14px] text-[#10284C]/50 font-medium mb-1">Welcome back,</p>
          <h1 className="text-[28px] font-extrabold text-[#10284C] tracking-tight">Sarah Johnson</h1>
        </div>
      </div>

      {/* Athlete Hero */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[20px] font-bold shrink-0">
              A
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC] mb-0.5">My Athlete</p>
              <h2 className="text-[22px] font-extrabold text-[#10284C] leading-tight">Ava</h2>
              <p className="text-[13px] text-[#10284C]/50 font-medium">Black Hornets Elite &middot; Setter &middot; #1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Event - Urgent */}
      <div className="px-6 mb-6">
        <div className="bg-[#10284C] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(16,40,76,0.2)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC]">Next Event</p>
          </div>
          <h3 className="text-[24px] font-extrabold text-white mb-1">Practice</h3>
          <p className="text-[15px] text-white/70 font-medium mb-1">Today at 6:00 PM</p>
          <p className="text-[13px] text-white/40 flex items-center gap-1 mb-4">
            <MapPin className="w-3.5 h-3.5" />
            Frisco Fieldhouse
          </p>
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 rounded-full bg-[#4BB9EC] text-[#10284C] text-[13px] font-bold">
              RSVP
            </button>
            <button className="flex-1 py-2.5 rounded-full bg-white/10 text-white text-[13px] font-semibold border border-white/15">
              Directions
            </button>
          </div>
        </div>
      </div>

      {/* Team Hub */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#10284C]/40 mb-3">Team Hub</p>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/15 flex items-center justify-center text-[18px] shrink-0">
              🎯
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#10284C] leading-snug">Coach Carlos gave Ava a <span className="text-[#4BB9EC] font-bold">Clutch Player</span> shoutout!</p>
              <p className="text-[12px] text-[#10284C]/40 mt-1">2h ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Season Snapshot */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#10284C]/40 mb-4">Season Snapshot</p>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[32px] font-extrabold text-[#22C55E] leading-none">6</p>
              <p className="text-[11px] text-[#10284C]/40 font-semibold mt-1">Wins</p>
            </div>
            <div className="w-px h-10 bg-[#E8ECF2]" />
            <div className="text-center">
              <p className="text-[32px] font-extrabold text-[#EF4444] leading-none">1</p>
              <p className="text-[11px] text-[#10284C]/40 font-semibold mt-1">Loss</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[12px] text-[#10284C]/40 font-medium">Latest Game</p>
              <p className="text-[18px] font-extrabold text-[#10284C]">Won 50-12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#10284C]/40 mb-3">Engagement</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 flex items-center justify-center text-lg">🏅</div>
            <div>
              <p className="text-[15px] font-bold text-[#10284C]">Level 4 Bronze</p>
              <p className="text-[12px] text-[#10284C]/40">750 / 800 XP</p>
            </div>
          </div>
          <div className="w-full h-2 bg-[#E8ECF2] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#4BB9EC] to-[#FFD700] rounded-full" style={{ width: '93.75%' }} />
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-4 px-5 flex items-center justify-between shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#EF4444]/70 mb-0.5">Outstanding Balance</p>
            <p className="text-[22px] font-extrabold text-[#10284C]">$209.99</p>
          </div>
          <button className="px-5 py-2.5 rounded-full bg-[#4BB9EC] text-[#10284C] text-[13px] font-bold">
            Pay Now
          </button>
        </div>
      </div>

      {/* Chat Preview */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] p-4 px-5 flex items-center gap-3 shadow-[0_2px_16px_rgba(16,40,76,0.06)] border border-[#E8ECF2]">
          <div className="w-11 h-11 rounded-full bg-[#10284C] flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-[#4BB9EC]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#10284C] truncate">Black Hornets Elite - Team Chat</p>
            <p className="text-[12px] text-[#10284C]/40 truncate">1 unread message</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#10284C]/30 shrink-0" />
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
