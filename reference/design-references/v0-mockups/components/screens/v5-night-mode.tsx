"use client"

import { Bell, Home, Calendar, MessageCircle, MoreHorizontal, MapPin, ArrowRight } from "lucide-react"

export function V5NightMode() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white">
      {/* Header */}
      <div className="pt-[64px] px-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[22px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[11px] font-bold">SJ</div>
            <button className="relative w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-[#4BB9EC]/15">
              <Bell className="w-4 h-4 text-white/60" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#EF4444] rounded-full text-[8px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </div>

        <p className="text-[13px] text-white/30 font-medium mb-0.5">Welcome back,</p>
        <h1 className="text-[22px] font-extrabold text-white">Sarah Johnson</h1>
      </div>

      {/* Athlete - Asymmetric Grid */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-5 gap-3">
          {/* Large Card */}
          <div className="col-span-3 rounded-[20px] bg-gradient-to-br from-[#10284C] to-[#162848] border border-[#4BB9EC]/10 p-5 flex flex-col justify-between min-h-[170px]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC] mb-1">My Athlete</p>
              <h2 className="text-[32px] font-extrabold text-white leading-none">Ava</h2>
            </div>
            <div>
              <p className="text-[12px] text-white/40 font-medium">Black Hornets Elite</p>
              <p className="text-[12px] text-white/25 font-medium">Setter &middot; #1</p>
            </div>
          </div>

          {/* Small Card - Avatar + Level */}
          <div className="col-span-2 rounded-[20px] bg-gradient-to-br from-[#4BB9EC]/15 to-[#10284C] border border-[#4BB9EC]/10 p-4 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[22px] font-extrabold border-2 border-[#4BB9EC]/30">
              A
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-full">LVL 4</span>
              <p className="text-[10px] text-white/30 mt-1 font-medium">Bronze</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Event */}
      <div className="px-5 mb-5">
        <div className="rounded-[20px] bg-gradient-to-r from-[#10284C] to-[#162848] border border-[#4BB9EC]/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC]">Next Event</p>
          </div>
          <h3 className="text-[24px] font-extrabold text-white mb-0.5">Practice</h3>
          <p className="text-[14px] text-white/50 font-semibold mb-1">Today at 6:00 PM</p>
          <p className="text-[12px] text-white/25 flex items-center gap-1.5 mb-4">
            <MapPin className="w-3 h-3" />
            Frisco Fieldhouse
          </p>
          <div className="flex gap-2.5">
            <button className="flex-1 py-2.5 rounded-full bg-[#4BB9EC] text-[#0D1B3E] text-[12px] font-bold">
              RSVP
            </button>
            <button className="flex-1 py-2.5 rounded-full bg-white/5 text-white/70 text-[12px] font-semibold border border-white/10">
              Directions
            </button>
          </div>
        </div>
      </div>

      {/* Game Score - Boarding Pass Style */}
      <div className="px-5 mb-5">
        <div className="rounded-[20px] bg-[#10284C] border border-[#4BB9EC]/10 overflow-hidden">
          <div className="p-4 px-5">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#22C55E] mb-3">Latest Game &middot; WIN</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-[40px] font-extrabold text-white leading-none">50</p>
                <p className="text-[11px] text-white/40 font-semibold mt-1">Hornets</p>
              </div>
              {/* Dashed Divider */}
              <div className="flex flex-col items-center gap-1 px-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-0.5 h-1.5 bg-white/10 rounded-full" />
                ))}
              </div>
              <div className="text-center">
                <p className="text-[40px] font-extrabold text-white/20 leading-none">12</p>
                <p className="text-[11px] text-white/20 font-semibold mt-1">Opponent</p>
              </div>
            </div>
          </div>
          <div className="border-t border-dashed border-white/10 px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] text-white/30 font-medium">Season</span>
            <span className="text-[13px] font-bold text-white">6W - 1L</span>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-5 mb-5">
        <div className="rounded-[20px] bg-[#10284C] border border-[#FFD700]/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#FFD700]">Engagement</p>
            <span className="text-[11px] font-bold text-[#FFD700]/70">750 / 800 XP</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full" style={{ width: '93.75%', background: 'linear-gradient(90deg, #4BB9EC, #FFD700)' }} />
          </div>
          <div className="flex gap-2">
            {['Iron Lung', 'Sniper', 'Team Spirit'].map((badge) => (
              <div key={badge} className="flex-1 bg-white/5 rounded-xl py-2 px-1.5 text-center border border-white/5">
                <div className="w-7 h-7 mx-auto rounded-lg bg-[#4BB9EC]/10 flex items-center justify-center text-[12px] mb-1">🛡</div>
                <p className="text-[9px] font-semibold text-white/30">{badge}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Hub */}
      <div className="px-5 mb-5">
        <div className="rounded-[20px] bg-[#10284C] border border-white/5 p-5">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/20 mb-3">Team Hub</p>
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[18px] shrink-0">🎯</div>
            <p className="text-[14px] font-semibold text-white/80 leading-snug">
              Coach Carlos gave Ava a <span className="text-[#4BB9EC] font-bold">Clutch Player</span> shoutout!
            </p>
          </div>
        </div>
      </div>

      {/* Balance + Chat row */}
      <div className="px-5 mb-5 flex gap-3">
        {/* Balance */}
        <div className="flex-1 rounded-[18px] bg-[#10284C] border border-[#EF4444]/10 p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#EF4444]/50 mb-1">Balance</p>
          <p className="text-[22px] font-extrabold text-white leading-none mb-2">$209<span className="text-[14px] text-white/30">.99</span></p>
          <button className="w-full py-2 rounded-full bg-[#4BB9EC] text-[#0D1B3E] text-[10px] font-bold">Pay Now</button>
        </div>

        {/* Chat */}
        <div className="flex-1 rounded-[18px] bg-[#10284C] border border-[#4BB9EC]/10 p-4 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/20 mb-1">Team Chat</p>
            <p className="text-[14px] font-bold text-white leading-snug">1 unread</p>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <MessageCircle className="w-3.5 h-3.5 text-[#4BB9EC]" />
            <span className="text-[11px] text-[#4BB9EC] font-semibold flex items-center gap-1">
              Open
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      <div className="h-24" />

      {/* Bottom Nav - Dark */}
      <div className="sticky bottom-0 bg-[#0D1B3E]/90 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex items-center justify-around">
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
      <div className={active ? "text-[#4BB9EC]" : "text-white/20"}>
        {icon}
      </div>
      <span className={`text-[10px] font-semibold ${active ? "text-[#4BB9EC]" : "text-white/20"}`}>{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#EF4444] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  )
}
