"use client"

import { Bell, Home, Calendar, MessageCircle, MoreHorizontal, MapPin, TrendingUp, CreditCard, Trophy } from "lucide-react"

export function V3DashboardCards() {
  const days = [
    { day: 'Mon', date: 17, active: false },
    { day: 'Tue', date: 18, active: false },
    { day: 'Wed', date: 19, active: true },
    { day: 'Thu', date: 20, active: false },
    { day: 'Fri', date: 21, active: false },
    { day: 'Sat', date: 22, active: false },
    { day: 'Sun', date: 23, active: false },
  ]

  return (
    <div className="min-h-full bg-[#F6F8FB] text-[#0D1B3E]">
      {/* Header */}
      <div className="pt-[64px] px-6 pb-3 bg-white border-b border-[#E8ECF2]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12px] text-[#10284C]/40 font-medium">Good afternoon,</p>
            <p className="text-[18px] font-extrabold text-[#10284C]">Sarah Johnson</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
            <button className="relative w-9 h-9 rounded-full bg-[#F6F8FB] flex items-center justify-center border border-[#E8ECF2]">
              <Bell className="w-4 h-4 text-[#10284C]" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#EF4444] rounded-full text-[8px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </div>

        {/* Day Strip Calendar */}
        <div className="flex items-center justify-between">
          {days.map((d) => (
            <div key={d.day} className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl ${d.active ? 'bg-[#4BB9EC] text-white' : ''}`}>
              <span className={`text-[10px] font-semibold ${d.active ? 'text-white/80' : 'text-[#10284C]/30'}`}>{d.day}</span>
              <span className={`text-[14px] font-bold ${d.active ? 'text-white' : 'text-[#10284C]'}`}>{d.date}</span>
              {d.active && <div className="w-1 h-1 rounded-full bg-white" />}
            </div>
          ))}
        </div>
      </div>

      {/* Event Card - Atmospheric */}
      <div className="px-5 pt-5 mb-4">
        <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-br from-[#10284C] to-[#0D1B3E] p-5 min-h-[160px] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0QkI5RUMiIHN0b3Atb3BhY2l0eT0iMC4xIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSJ0cmFuc3BhcmVudCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiByPSIxMDAiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC]">Today &middot; 6:00 PM</p>
            </div>
            <h3 className="text-[26px] font-extrabold text-white mb-0.5">Practice</h3>
            <p className="text-[13px] text-white/40 flex items-center gap-1.5 mb-4">
              <MapPin className="w-3.5 h-3.5" />
              Frisco Fieldhouse
            </p>
            <div className="flex gap-2.5">
              <button className="px-6 py-2 rounded-full bg-[#4BB9EC] text-[#10284C] text-[12px] font-bold">
                RSVP
              </button>
              <button className="px-6 py-2 rounded-full bg-white/10 text-white text-[12px] font-semibold border border-white/10">
                Directions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Athlete Strip */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-[18px] p-4 flex items-center gap-3.5 shadow-[0_2px_12px_rgba(16,40,76,0.05)] border border-[#E8ECF2]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-white text-[18px] font-extrabold shrink-0">
            A
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-extrabold text-[#10284C]">Ava <span className="text-[#10284C]/30 font-semibold text-[12px]">#1</span></p>
            <p className="text-[12px] text-[#10284C]/40 font-medium">Black Hornets Elite &middot; Setter</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-full">LVL 4</span>
          </div>
        </div>
      </div>

      {/* Metric Grid - 2x2 */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Record */}
          <div className="bg-white rounded-[18px] p-4 shadow-[0_2px_12px_rgba(16,40,76,0.05)] border border-[#E8ECF2]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#10284C]/30">Record</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-extrabold text-[#10284C] leading-none">6-1</span>
            </div>
            <p className="text-[11px] text-[#22C55E] font-semibold mt-1">Won 50-12</p>
          </div>

          {/* Balance */}
          <div className="bg-white rounded-[18px] p-4 shadow-[0_2px_12px_rgba(16,40,76,0.05)] border border-[#E8ECF2]">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-3.5 h-3.5 text-[#EF4444]" />
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#10284C]/30">Balance</p>
            </div>
            <p className="text-[28px] font-extrabold text-[#10284C] leading-none">$210</p>
            <button className="mt-2 text-[11px] font-bold text-[#4BB9EC]">Pay Now</button>
          </div>

          {/* XP Progress */}
          <div className="bg-white rounded-[18px] p-4 shadow-[0_2px_12px_rgba(16,40,76,0.05)] border border-[#E8ECF2]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#10284C]/30">Progress</p>
            </div>
            <p className="text-[22px] font-extrabold text-[#10284C] leading-none">750<span className="text-[14px] text-[#10284C]/30">/800</span></p>
            <div className="w-full h-1.5 bg-[#E8ECF2] rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-[#4BB9EC] to-[#FFD700] rounded-full" style={{ width: '93%' }} />
            </div>
          </div>

          {/* Chat */}
          <div className="bg-[#10284C] rounded-[18px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-3.5 h-3.5 text-[#4BB9EC]" />
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/30">Chat</p>
            </div>
            <p className="text-[14px] font-bold text-white leading-snug">Team Chat</p>
            <p className="text-[11px] text-white/40 mt-0.5">1 unread</p>
            <div className="w-5 h-5 bg-[#4BB9EC] rounded-full text-[10px] font-bold text-[#10284C] flex items-center justify-center mt-2">1</div>
          </div>
        </div>
      </div>

      {/* Team Hub Post */}
      <div className="px-5 mb-5">
        <div className="bg-white rounded-[18px] p-4 shadow-[0_2px_12px_rgba(16,40,76,0.05)] border border-[#E8ECF2]">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#10284C]/30 mb-3">Team Hub</p>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[16px] shrink-0">🎯</div>
            <p className="text-[13px] font-semibold text-[#10284C] leading-snug">
              Coach Carlos gave Ava a <span className="text-[#4BB9EC] font-bold">Clutch Player</span> shoutout!
            </p>
          </div>
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
