"use client"

import { Home, Zap, MessageCircle, MoreHorizontal, MapPin, Flame, ChevronRight, TrendingUp } from "lucide-react"

export function S1PlayerHome() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full px-2.5 py-1">
              <Flame className="w-3.5 h-3.5 text-[#FFD700]" />
              <span className="text-[11px] font-bold text-[#FFD700]">3</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-[11px] font-bold border border-[#4BB9EC]/30">AW</div>
          </div>
        </div>
      </div>

      {/* Hero Player Card */}
      <div className="px-5 mb-4">
        <div className="rounded-[22px] bg-gradient-to-br from-[#10284C] via-[#162848] to-[#10284C] border border-[#4BB9EC]/15 p-5 relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#4BB9EC]/60 mb-1">Player</p>
                <h1 className="font-serif text-[42px] leading-[0.9] tracking-wide text-white">AVA</h1>
                <h1 className="font-serif text-[42px] leading-[0.9] tracking-wide text-white">WILLIAMS</h1>
              </div>
              {/* OVR Badge */}
              <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border-2 border-[#FFD700]/40 flex flex-col items-center justify-center badge-glow">
                <span className="font-serif text-[28px] leading-none text-[#FFD700]">56</span>
                <span className="text-[8px] font-bold text-[#FFD700]/60 tracking-wider">OVR</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-semibold text-white/40">Black Hornets Elite</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[11px] font-semibold text-white/40">Setter</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[11px] font-semibold text-white/40">#1</span>
            </div>
            {/* Level Progress */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-1 rounded-full border border-[#FFD700]/15">LVL 4</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full xp-shimmer" style={{ width: '93.75%' }} />
              </div>
              <span className="text-[10px] font-semibold text-white/30">750/800</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-3 rounded-[16px] bg-gradient-to-r from-[#FFD700]/10 via-[#FFD700]/5 to-transparent border border-[#FFD700]/15 px-4 py-3 streak-pulse">
          <Flame className="w-5 h-5 text-[#FFD700]" />
          <div>
            <p className="text-[13px] font-bold text-[#FFD700]">3-Day Streak</p>
            <p className="text-[10px] text-white/30 font-medium">{"Keep it going — you're locked in"}</p>
          </div>
        </div>
      </div>

      {/* Next Event */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-[#4BB9EC]/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#4BB9EC]">Next Up</p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[20px] font-extrabold text-white">Practice</h3>
              <p className="text-[13px] text-white/40 font-medium">Today at 6:00 PM</p>
            </div>
            <button className="px-5 py-2 rounded-full bg-[#4BB9EC] text-[#0D1B3E] text-[11px] font-bold tracking-wide uppercase">
              {"I'm Ready"}
            </button>
          </div>
          <p className="text-[11px] text-white/20 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Frisco Fieldhouse
          </p>
        </div>
      </div>

      {/* Coach Shoutout */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-gradient-to-r from-[#4BB9EC]/10 to-[#10284C] border border-[#4BB9EC]/10 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4BB9EC]/15 flex items-center justify-center text-[16px] shrink-0">
            <TrendingUp className="w-5 h-5 text-[#4BB9EC]" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-white/80 leading-snug">
              Coach Carlos gave you a <span className="text-[#4BB9EC] font-bold">Clutch Player</span> shoutout
            </p>
            <p className="text-[10px] text-white/25 mt-1 font-medium">2h ago</p>
          </div>
        </div>
      </div>

      {/* XP Earned */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-[#FFD700]/10 p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#FFD700]/50 mb-2">Today</p>
          <div className="flex items-center gap-3">
            <span className="font-serif text-[36px] text-[#FFD700] leading-none">+50</span>
            <div>
              <p className="text-[12px] font-semibold text-white/60">XP earned</p>
              <p className="text-[10px] text-white/25 font-medium">Practice attendance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Game Stats */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-white/5 p-4">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/20 mb-3">Last Game Highlights</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: '22', label: 'Assists' },
              { val: '100', label: 'Hit %' },
              { val: '100', label: 'Srv %' },
              { val: '0', label: 'Blocks' },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/[0.03] rounded-xl py-2.5">
                <p className="font-serif text-[22px] text-white leading-none">{s.val}</p>
                <p className="text-[9px] text-white/25 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Chat Preview */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4BB9EC]/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4.5 h-4.5 text-[#4BB9EC]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate">Team Chat</p>
            <p className="text-[11px] text-white/30 truncate">1 unread message</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-gradient-to-r from-[#FFD700]/8 to-[#10284C] border border-[#FFD700]/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#FFD700]">Daily Challenge</p>
          </div>
          <p className="text-[14px] font-bold text-white mb-1">Complete 20 serves at practice</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFD700] rounded-full" style={{ width: '0%' }} />
            </div>
            <span className="text-[10px] text-white/25 font-semibold">0/20</span>
          </div>
          <p className="text-[10px] text-[#FFD700]/40 mt-1 font-medium">+25 XP reward</p>
        </div>
      </div>

      <div className="h-24" />

      {/* Bottom Nav */}
      <PlayerNav activeTab="home" />
    </div>
  )
}

function PlayerNav({ activeTab }: { activeTab: string }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'gameday', icon: Zap, label: 'Game Day' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: 1 },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ]
  return (
    <div className="sticky bottom-0 bg-[#0D1B3E]/95 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex items-center justify-around">
      {tabs.map((tab) => (
        <div key={tab.id} className="flex flex-col items-center gap-0.5 relative">
          <div className={activeTab === tab.id ? "text-[#4BB9EC]" : "text-white/20"}>
            <tab.icon className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-semibold ${activeTab === tab.id ? "text-[#4BB9EC]" : "text-white/20"}`}>{tab.label}</span>
          {tab.badge && (
            <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 bg-[#4BB9EC] rounded-full text-[9px] font-bold text-[#0D1B3E] flex items-center justify-center">
              {tab.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
