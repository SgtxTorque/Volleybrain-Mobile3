"use client"

import { Home, Zap, MessageCircle, MoreHorizontal, Crown, Flame, ArrowUp, Heart } from "lucide-react"

const leaderboard = [
  { rank: 1, name: 'Ava W.', initials: 'AW', xp: 750, level: 4, streak: 3, isYou: true, color: '#FFD700' },
  { rank: 2, name: 'Mia J.', initials: 'MJ', xp: 720, level: 4, streak: 5, isYou: false, color: '#C0C0C0' },
  { rank: 3, name: 'Kai L.', initials: 'KL', xp: 680, level: 3, streak: 2, isYou: false, color: '#CD7F32' },
  { rank: 4, name: 'Zoe R.', initials: 'ZR', xp: 640, level: 3, streak: 0, isYou: false, color: '' },
  { rank: 5, name: 'Luna T.', initials: 'LT', xp: 590, level: 3, streak: 1, isYou: false, color: '' },
]

const reactions = [
  { user: 'Mia J.', initials: 'MJ', message: 'That set was filthy', time: '2h ago' },
  { user: 'Coach Carlos', initials: 'CC', message: 'Ava is locked in this season. MVP energy.', time: '3h ago' },
  { user: 'Kai L.', initials: 'KL', message: 'Nobody stopping us Saturday', time: '5h ago' },
]

export function S5TeamPulse() {
  return (
    <div className="min-h-full bg-[#0D1B3E] text-white">
      {/* Header */}
      <div className="pt-[60px] px-5 pb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[20px] font-extrabold tracking-tight text-[#4BB9EC]">lynx</p>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4BB9EC] to-[#10284C] flex items-center justify-center text-[11px] font-bold border border-[#4BB9EC]/30">AW</div>
        </div>
      </div>

      {/* Team Pulse Title */}
      <div className="px-5 mb-4">
        <h1 className="font-serif text-[44px] leading-none tracking-wide text-white">TEAM</h1>
        <h1 className="font-serif text-[44px] leading-none tracking-wide text-[#4BB9EC]">PULSE</h1>
        <p className="text-[12px] text-white/25 font-medium mt-1">Black Hornets Elite &middot; Live feed</p>
      </div>

      {/* Top 3 Podium */}
      <div className="px-5 mb-5">
        <div className="rounded-[22px] bg-gradient-to-b from-[#162848] to-[#10284C] border border-[#FFD700]/10 p-5 pt-6">
          <div className="flex items-end justify-center gap-3 mb-3">
            {/* 2nd place */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C0C0C0]/20 to-[#10284C] border-2 border-[#C0C0C0]/25 flex items-center justify-center text-[12px] font-bold text-white/60 mb-1">
                MJ
              </div>
              <div className="w-14 h-16 bg-[#C0C0C0]/8 rounded-t-xl flex flex-col items-center justify-end pb-2 border-t-2 border-[#C0C0C0]/20">
                <span className="font-serif text-[18px] text-[#C0C0C0] leading-none">2</span>
              </div>
            </div>

            {/* 1st place */}
            <div className="flex flex-col items-center -mt-4">
              <Crown className="w-5 h-5 text-[#FFD700] mb-1" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700]/25 to-[#10284C] border-2 border-[#FFD700]/40 flex items-center justify-center text-[13px] font-bold text-[#FFD700] mb-1 badge-glow">
                AW
              </div>
              <div className="w-16 h-20 bg-[#FFD700]/8 rounded-t-xl flex flex-col items-center justify-end pb-2 border-t-2 border-[#FFD700]/30">
                <span className="font-serif text-[20px] text-[#FFD700] leading-none">1</span>
              </div>
            </div>

            {/* 3rd place */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CD7F32]/20 to-[#10284C] border-2 border-[#CD7F32]/25 flex items-center justify-center text-[12px] font-bold text-white/60 mb-1">
                KL
              </div>
              <div className="w-14 h-12 bg-[#CD7F32]/8 rounded-t-xl flex flex-col items-center justify-end pb-2 border-t-2 border-[#CD7F32]/20">
                <span className="font-serif text-[18px] text-[#CD7F32] leading-none">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-2">XP Leaderboard</p>
        <div className="flex flex-col gap-2">
          {leaderboard.map((player) => (
            <div
              key={player.rank}
              className={`rounded-[14px] p-3 flex items-center gap-3 ${player.isYou ? 'bg-[#4BB9EC]/10 border border-[#4BB9EC]/15' : 'bg-[#10284C] border border-white/5'}`}
            >
              <span className={`text-[14px] font-bold w-5 text-center ${player.rank <= 3 ? '' : 'text-white/20'}`} style={player.rank <= 3 ? { color: player.color } : {}}>
                {player.rank}
              </span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${player.isYou ? 'bg-[#4BB9EC]/20 text-[#4BB9EC] border border-[#4BB9EC]/25' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                {player.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-[12px] font-bold truncate ${player.isYou ? 'text-white' : 'text-white/60'}`}>
                    {player.name}
                    {player.isYou && <span className="text-[#4BB9EC] ml-1 text-[10px]">(You)</span>}
                  </p>
                  {player.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[#FFD700]">
                      <Flame className="w-3 h-3" />
                      <span className="text-[9px] font-bold">{player.streak}</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/20 font-medium">Lvl {player.level} &middot; {player.xp} XP</p>
              </div>
              {player.isYou && (
                <div className="flex items-center gap-0.5 text-[#22C55E]">
                  <ArrowUp className="w-3 h-3" />
                  <span className="text-[10px] font-bold">1</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team Wall / Social Feed */}
      <div className="px-5 mb-4">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20 mb-2">Team Wall</p>
        <div className="flex flex-col gap-2.5">
          {reactions.map((r, i) => (
            <div key={i} className="rounded-[16px] bg-[#10284C] border border-white/5 p-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4BB9EC]/10 flex items-center justify-center text-[10px] font-bold text-[#4BB9EC] shrink-0">
                  {r.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[11px] font-bold text-white/60">{r.user}</p>
                    <span className="text-[9px] text-white/15 font-medium">{r.time}</span>
                  </div>
                  <p className="text-[13px] text-white/80 font-medium leading-snug">{r.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 ml-11">
                <button className="flex items-center gap-1 text-white/15 hover:text-[#EF4444] transition-colors">
                  <Heart className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">3</span>
                </button>
                <button className="text-[9px] font-semibold text-white/15">Reply</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Shoutout */}
      <div className="px-5 mb-4">
        <div className="rounded-[16px] bg-gradient-to-r from-[#FFD700]/8 to-[#10284C] border border-[#FFD700]/15 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-white/60">Give a teammate props</p>
            <p className="text-[10px] text-white/25 font-medium">0 shoutouts given this week</p>
          </div>
          <button className="px-3 py-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/20 text-[10px] font-bold text-[#FFD700]">
            Shout
          </button>
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
