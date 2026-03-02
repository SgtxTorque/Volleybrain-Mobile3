"use client"

import { Home, Zap, MessageCircle, MoreHorizontal, Lock, Clock } from "lucide-react"

const earnedBadges = [
  { name: 'Hype Machine', icon: '🔥', date: 'Feb 20', rarity: 'Rare', color: '#FFD700' },
  { name: 'First Shoutout', icon: '📣', date: 'Feb 18', rarity: 'Common', color: '#4BB9EC' },
  { name: 'First Blood', icon: '⚡', date: 'Feb 15', rarity: 'Common', color: '#4BB9EC' },
  { name: 'Paid in Full', icon: '💰', date: 'Feb 12', rarity: 'Common', color: '#22C55E' },
  { name: 'Multi-Sport', icon: '🏆', date: 'Feb 8', rarity: 'Rare', color: '#FFD700' },
  { name: 'Iron Lung', icon: '💨', date: 'Feb 5', rarity: 'Epic', color: '#A855F7' },
]

const lockedBadges = [
  { name: 'Sniper', icon: '🎯', progress: 80, current: '8/10 aces', color: '#4BB9EC' },
  { name: 'Team Spirit', icon: '🤝', progress: 0, current: '0/3 shoutouts', color: '#FFD700' },
  { name: 'Ironwall', icon: '🛡', progress: 0, current: '0/5 blocks', color: '#EF4444' },
  { name: 'Legendary', icon: '👑', progress: 40, current: 'Lvl 4/10', color: '#FFD700' },
]

export function S2BadgesChallenges() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-1 rounded-full border border-[#FFD700]/15">LVL 4</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-[11px] font-bold border border-[#4BB9EC]/30">AW</div>
          </div>
        </div>
      </div>

      {/* Trophy Case Header */}
      <div className="px-5 mb-2">
        <h1 className="font-serif text-[48px] leading-none tracking-wide text-white">TROPHY</h1>
        <h1 className="font-serif text-[48px] leading-none tracking-wide text-[#FFD700]">CASE</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[12px] font-bold text-white/40">6 Earned</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
      </div>

      {/* XP Bar */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-3 bg-[#10284C] rounded-2xl p-3.5 border border-[#FFD700]/10">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-white/50">Bronze</span>
              <span className="text-[11px] font-bold text-[#FFD700]">750 / 800 XP</span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full xp-shimmer" style={{ width: '93.75%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-3">Unlocked</p>
        <div className="grid grid-cols-3 gap-2.5">
          {earnedBadges.map((badge) => (
            <div
              key={badge.name}
              className="rounded-[18px] bg-[#10284C] border p-3.5 flex flex-col items-center text-center relative overflow-hidden"
              style={{ borderColor: `${badge.color}20` }}
            >
              {/* Rarity glow */}
              <div className="absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(circle at 50% 30%, ${badge.color}, transparent 70%)` }} />
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] mb-2"
                  style={{ background: `${badge.color}15` }}
                >
                  {badge.icon}
                </div>
                <p className="text-[10px] font-bold text-white/80 leading-tight mb-0.5">{badge.name}</p>
                <span className="text-[8px] font-bold tracking-wider uppercase" style={{ color: badge.color }}>{badge.rarity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked Badges */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-3">Locked</p>
        <div className="flex flex-col gap-2.5">
          {lockedBadges.map((badge) => (
            <div
              key={badge.name}
              className="rounded-[16px] bg-[#10284C] border border-white/5 p-3.5 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center text-[20px] relative shrink-0">
                <span className="opacity-30">{badge.icon}</span>
                <Lock className="w-3 h-3 text-white/20 absolute bottom-0.5 right-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white/50">{badge.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${badge.progress}%`, backgroundColor: badge.color }}
                    />
                  </div>
                  <span className="text-[9px] text-white/20 font-semibold shrink-0">{badge.current}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Challenges */}
      <div className="px-5 mb-4">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-3">Active Challenges</p>
        <div className="rounded-[18px] bg-gradient-to-br from-[#FFD700]/8 to-[#10284C] border border-[#FFD700]/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
            <p className="text-[12px] font-bold text-[#FFD700]">Score 5 aces this week</p>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFD700] rounded-full" style={{ width: '60%' }} />
            </div>
            <span className="text-[10px] font-bold text-white/30">3/5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#FFD700]/40 font-medium">+100 XP reward</span>
            <div className="flex items-center gap-1 text-white/20">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-semibold">4d left</span>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] bg-[#10284C] border border-[#4BB9EC]/10 p-4 mt-2.5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#4BB9EC]" />
            <p className="text-[12px] font-bold text-[#4BB9EC]">Give 2 shoutouts to teammates</p>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#4BB9EC] rounded-full" style={{ width: '0%' }} />
            </div>
            <span className="text-[10px] font-bold text-white/30">0/2</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#4BB9EC]/40 font-medium">+50 XP reward</span>
            <div className="flex items-center gap-1 text-white/20">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-semibold">6d left</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mascot */}
      <div className="px-5 mb-4">
        <div className="rounded-[16px] bg-[#10284C] border border-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4BB9EC]/10 flex items-center justify-center text-[20px] shrink-0">
            🐆
          </div>
          <p className="text-[12px] text-white/40 font-semibold leading-snug">
            {"Almost there — 50 more XP to hit Bronze! Keep grinding."}
          </p>
        </div>
      </div>

      <div className="h-24" />

      {/* Bottom Nav */}
      <PlayerNav activeTab="more" />
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
