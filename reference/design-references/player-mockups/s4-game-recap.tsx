"use client"

import { Home, Zap, MessageCircle, MoreHorizontal, Share2, Trophy, Star } from "lucide-react"

export function S4GameRecap() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <button className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <Share2 className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-bold text-white/40">Share</span>
          </button>
        </div>
      </div>

      {/* Match Result Hero */}
      <div className="px-5 mb-4">
        <div className="rounded-[22px] bg-gradient-to-b from-[#22C55E]/10 via-[#162848] to-[#10284C] border border-[#22C55E]/15 overflow-hidden">
          {/* WIN Banner */}
          <div className="text-center pt-5 pb-3">
            <div className="inline-flex items-center gap-2 bg-[#22C55E]/15 border border-[#22C55E]/25 rounded-full px-4 py-1.5 mb-3">
              <Trophy className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[11px] font-bold text-[#22C55E] tracking-wider uppercase">Victory</span>
            </div>
            <p className="text-[10px] text-white/25 font-medium">Feb 24, 2026</p>
          </div>

          {/* Teams + Score */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-left flex-1">
                <p className="text-[11px] font-bold text-[#4BB9EC] uppercase tracking-wide">Hornets</p>
              </div>
              <div className="px-4">
                <p className="text-[10px] text-white/15 font-bold uppercase tracking-widest">vs</p>
              </div>
              <div className="text-right flex-1">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-wide">Eagles</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-serif text-[64px] leading-none text-white">50</span>
              <div className="flex flex-col items-center gap-1 px-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-0.5 h-2 bg-white/8 rounded-full" />
                ))}
              </div>
              <span className="font-serif text-[64px] leading-none text-white/15">12</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-bold text-[#22C55E]">Black Hornets Elite</span>
              <span className="text-[10px] font-semibold text-white/20">Allen Eagles</span>
            </div>
          </div>
        </div>
      </div>

      {/* MVP Highlight */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-gradient-to-r from-[#FFD700]/10 to-[#10284C] border border-[#FFD700]/20 p-4 flex items-center gap-3 badge-glow">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/15 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-[#FFD700]" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#FFD700]/60 mb-0.5">Match MVP</p>
            <p className="text-[16px] font-extrabold text-white">Ava Williams</p>
            <p className="text-[11px] text-white/30 font-medium">22 Assists &middot; 100% Hit Rate</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-white/5 p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-3">Your Performance</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Assists', value: '22', highlight: true },
              { label: 'Hit %', value: '100%', highlight: true },
              { label: 'Serve %', value: '100%', highlight: true },
              { label: 'Blocks', value: '0', highlight: false },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-[14px] p-3.5 text-center ${stat.highlight ? 'bg-[#4BB9EC]/8 border border-[#4BB9EC]/10' : 'bg-white/[0.02] border border-white/5'}`}
              >
                <p className={`font-serif text-[32px] leading-none ${stat.highlight ? 'text-white' : 'text-white/30'}`}>{stat.value}</p>
                <p className="text-[10px] text-white/30 font-semibold mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-[#FFD700]/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#FFD700]/50">XP Earned</p>
            <span className="font-serif text-[28px] leading-none text-[#FFD700]">+150</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Attendance', xp: '+50' },
              { label: 'Win Bonus', xp: '+50' },
              { label: 'MVP Award', xp: '+50' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-3 py-2">
                <span className="text-[11px] text-white/40 font-medium">{item.label}</span>
                <span className="text-[12px] font-bold text-[#FFD700]">{item.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges Unlocked */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-gradient-to-r from-[#A855F7]/8 to-[#10284C] border border-[#A855F7]/15 p-4">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#A855F7]/60 mb-2">Badge Unlocked</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#A855F7]/15 flex items-center justify-center text-[22px] badge-glow">
              🔥
            </div>
            <div>
              <p className="text-[14px] font-bold text-white">Hype Machine</p>
              <p className="text-[10px] text-[#A855F7] font-semibold">Rare Achievement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Shoutouts */}
      <div className="px-5 mb-4">
        <div className="rounded-[18px] bg-[#10284C] border border-white/5 p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-3">Shoutouts</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-[#4BB9EC]/10 flex items-center justify-center text-[12px] font-bold text-[#4BB9EC] shrink-0">CC</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/60 truncate">
                  Coach Carlos tagged you <span className="text-[#4BB9EC]">Clutch</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[12px] font-bold text-[#FFD700] shrink-0">MJ</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/60 truncate">
                  Mia Jones said <span className="text-[#FFD700]">{"Built different"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Highlights */}
      <div className="px-5 mb-4">
        <button className="w-full py-3 rounded-2xl bg-[#4BB9EC] text-[#0D1B3E] text-[13px] font-bold flex items-center justify-center gap-2">
          <Star className="w-4 h-4" />
          Add to Highlights
        </button>
      </div>

      <div className="h-24" />

      {/* Bottom Nav */}
      <PlayerNav activeTab="gameday" />
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
