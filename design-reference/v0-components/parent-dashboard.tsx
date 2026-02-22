import Image from "next/image"
import { Bell, MapPin } from "lucide-react"
import { BottomNav } from "./bottom-nav"
import { SectionHeader } from "./section-header"
import { MatchCard } from "./match-card"

function VolleyballIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
      <path d="M2 12h20" />
    </svg>
  )
}

function PlayerCard({
  name,
  team,
  number,
  position,
  image,
}: {
  name: string
  team: string
  number: string
  position: string
  image: string
}) {
  return (
    <div className="relative w-[150px] h-[210px] rounded-xl overflow-hidden shrink-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {/* Top badge */}
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
        <VolleyballIcon className="w-3 h-3 text-steel-blue" />
      </div>
      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1B2838] via-[#1B2838]/80 to-transparent pt-12 pb-3 px-3">
        <p className="text-card text-sm font-bold leading-tight">{name}</p>
        <p className="text-card/70 text-[10px] font-medium">{team}</p>
        <div className="flex gap-1.5 mt-1">
          <span className="text-[9px] bg-card/20 text-card px-1.5 py-0.5 rounded-full font-bold">
            {number}
          </span>
          <span className="text-[9px] bg-teal/30 text-teal px-1.5 py-0.5 rounded-full font-bold">
            {position}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ParentDashboard() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-steel-blue">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-card/20 flex items-center justify-center">
            <VolleyballIcon className="w-4 h-4 text-card" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-card">
            VolleyBrain
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative" aria-label="Notifications">
            <Bell size={18} className="text-card" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-coral rounded-full border border-steel-blue" />
          </button>
          <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center">
            <span className="text-[11px] font-bold text-card">JD</span>
          </div>
        </div>
      </div>

      {/* Upcoming badge */}
      <div className="flex justify-center -mb-3 relative z-10 pt-3">
        <span className="px-4 py-1 bg-teal text-card text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md">
          Upcoming
        </span>
      </div>

      {/* Hero card */}
      <div className="px-4 pt-5 pb-2">
        <div className="relative h-[220px] rounded-xl overflow-hidden shadow-lg">
          <Image
            src="/images/volleyball-hero.jpg"
            alt="Volleyball action shot"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B2838] via-[#1B2838]/50 to-transparent" />
          {/* Away badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-0.5 bg-orange text-card text-[9px] font-bold uppercase rounded-full">
              Away
            </span>
          </div>
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-teal text-xs font-extrabold uppercase tracking-widest mb-0.5">
              Today
            </p>
            <h2 className="text-card text-xl font-extrabold uppercase tracking-wide leading-tight">
              Game Day
            </h2>
            <p className="text-card/90 text-xs font-medium mt-1">
              vs North Dallas Spike
            </p>
            <p className="text-card/70 text-[10px] mt-0.5">
              Saturday, Feb 21, 2026 &bull; 2:00 PM
            </p>
            <p className="text-card/60 text-[10px]">Frisco Fieldhouse</p>
            <button className="mt-2 flex items-center gap-1.5 bg-card/15 backdrop-blur-sm text-card text-[10px] font-semibold px-3 py-1.5 rounded-full border border-card/20 hover:bg-card/25 transition-colors">
              <MapPin size={10} />
              Get Directions
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming section */}
      <SectionHeader title="Upcoming" />
      <MatchCard
        homeTeam="B. Hornets"
        awayTeam="Eagles"
        time="9:00 AM"
        date="22 FEB"
        venue="Fieldhouse USA, Frisco TX"
        borderColor="teal"
      />
      <MatchCard
        homeTeam="B. Hornets"
        awayTeam="Spark"
        time="2:00 PM"
        date="28 FEB"
        venue="North Dallas Sports Center"
        borderColor="teal"
      />

      {/* My Players */}
      <SectionHeader title="My Players" />
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <PlayerCard
          name="Emma Davis"
          team="Black Hornets 14U"
          number="#7"
          position="S"
          image="/images/player-1.jpg"
        />
        <PlayerCard
          name="Maya Chen"
          team="Black Hornets 14U"
          number="#12"
          position="OH"
          image="/images/player-2.jpg"
        />
        <PlayerCard
          name="Sophia Lee"
          team="Black Hornets 14U"
          number="#4"
          position="L"
          image="/images/player-3.jpg"
        />
      </div>

      {/* Announcements */}
      <SectionHeader title="Announcements" />
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-l-4 border-l-teal p-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5" role="img" aria-label="trophy">
              {"🏆"}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-navy">
                {"Emma's team won! Great game!"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                2 hours ago
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <BottomNav active="home" />
    </div>
  )
}
