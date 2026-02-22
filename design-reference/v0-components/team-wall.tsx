import Image from "next/image"
import { ArrowLeft, SquarePen, Plus } from "lucide-react"
import { BottomNav } from "./bottom-nav"
import { PillTabs } from "./pill-tabs"
import { cn } from "@/lib/utils"

function VolleyballLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#2C5F7C" strokeWidth="3" fill="none" />
      <path d="M24 2C24 2 10 14 10 24C10 34 24 46 24 46" stroke="#2C5F7C" strokeWidth="2" fill="none" />
      <path d="M24 2C24 2 38 14 38 24C38 34 24 46 24 46" stroke="#2C5F7C" strokeWidth="2" fill="none" />
      <path d="M2 24H46" stroke="#2C5F7C" strokeWidth="2" />
      <circle cx="24" cy="24" r="6" fill="#14B8A6" />
    </svg>
  )
}

interface PostCardProps {
  avatar: string
  author: string
  time: string
  content: string
  borderColor: "steel" | "teal" | "orange" | "navy"
  badge?: string
  badgeColor?: string
  image?: string
  reactions: { emoji: string; count: number }[]
  comments: number
  children?: React.ReactNode
}

const postBorderColors = {
  steel: "border-l-steel-blue",
  teal: "border-l-teal",
  orange: "border-l-orange",
  navy: "border-l-navy",
}

function PostCard({
  avatar,
  author,
  time,
  content,
  borderColor,
  badge,
  badgeColor,
  image,
  reactions,
  comments,
  children,
}: PostCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-l-4 mx-4 mb-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow",
        postBorderColors[borderColor]
      )}
    >
      <div className="p-3">
        {/* Badge */}
        {badge && (
          <div className="mb-2">
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", badgeColor)}>
              {badge}
            </span>
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#E8F0F5] flex items-center justify-center overflow-hidden shrink-0">
            <span className="text-[10px] font-bold text-steel-blue">{avatar}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-navy">{author}</p>
            <p className="text-[9px] text-muted-foreground">{time}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-[11px] text-navy/80 leading-relaxed mb-2">{content}</p>

        {/* Optional children (scoreboard etc) */}
        {children}

        {/* Optional image */}
        {image && (
          <div className="relative w-full h-[140px] rounded-lg overflow-hidden mb-2">
            <Image
              src={image}
              alt="Post image"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          {reactions.map((r, i) => (
            <span key={i} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <span>{r.emoji}</span> {r.count}
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            {"💬"} {comments}
          </span>
          <div className="flex-1" />
          <button className="text-[10px] font-semibold text-steel-blue hover:text-steel-blue/80 transition-colors">
            Like
          </button>
          <button className="text-[10px] font-semibold text-steel-blue hover:text-steel-blue/80 transition-colors">
            Comment
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeamWall() {
  return (
    <div className="flex flex-col min-h-full relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button aria-label="Go back">
          <ArrowLeft size={20} className="text-navy" strokeWidth={2} />
        </button>
        <h1 className="text-sm font-extrabold uppercase tracking-widest text-navy">
          Team Wall
        </h1>
        <button aria-label="Compose post">
          <SquarePen size={18} className="text-navy" strokeWidth={2} />
        </button>
      </div>

      {/* Team tabs */}
      <PillTabs
        tabs={["Hornets 14U", "Hornets 16U"]}
        activeTab={0}
      />

      {/* Team identity banner */}
      <div className="flex flex-col items-center py-4 px-4">
        <VolleyballLogo />
        <h2 className="text-lg font-extrabold uppercase tracking-wider text-navy mt-2">
          Black Hornets 14U
        </h2>
        <p className="text-[10px] text-muted-foreground font-medium">
          Spring 2026 Season
        </p>
        {/* Sub-tabs */}
        <div className="flex items-center gap-4 mt-3">
          <button className="text-[10px] font-bold uppercase tracking-wider text-steel-blue border-b-2 border-steel-blue pb-0.5">
            Feed
          </button>
          <button className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-0.5">
            Media
          </button>
          <button className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-0.5">
            Files
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="pb-20">
        {/* Coach update */}
        <PostCard
          avatar="CC"
          author="Coach Carlos"
          time="2 hours ago"
          content={"Great energy at practice today! Remember to hydrate before Saturday's tournament. Let's bring that same focus! \uD83C\uDFD0\uD83D\uDCAA"}
          borderColor="steel"
          reactions={[{ emoji: "\uD83D\uDC4F", count: 12 }]}
          comments={3}
        />

        {/* Match result */}
        <PostCard
          avatar="VB"
          author="VolleyBrain"
          time="Yesterday"
          content=""
          borderColor="teal"
          badge={"\uD83C\uDFC6 MATCH RESULT"}
          badgeColor="bg-teal/15 text-teal"
          reactions={[{ emoji: "\uD83C\uDF89", count: 24 }]}
          comments={8}
        >
          {/* Mini scoreboard */}
          <div className="bg-[#F5F8FA] rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-steel-blue/10 flex items-center justify-center">
                  <span className="text-[8px]">{"\uD83C\uDFD0"}</span>
                </div>
                <span className="text-[10px] font-bold text-navy uppercase">B. Hornets</span>
              </div>
              <span className="text-lg font-extrabold text-steel-blue">25</span>
              <span className="text-[10px] text-muted-foreground font-medium">vs</span>
              <span className="text-lg font-extrabold text-muted-foreground">21</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-navy uppercase">N. Dallas</span>
                <div className="w-5 h-5 rounded-full bg-coral/10 flex items-center justify-center">
                  <span className="text-[8px]">{"\uD83C\uDFD0"}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-center text-teal font-bold mt-1.5">
              Set 3 of 3 &bull; FINAL &bull; Black Hornets Win!
            </p>
            <p className="text-[8px] text-center text-muted-foreground mt-0.5">
              Westfield Arena &bull; Feb 15, 2026
            </p>
          </div>
        </PostCard>

        {/* Photo post */}
        <PostCard
          avatar="JD"
          author="Jennifer Davis"
          time="Yesterday"
          content="So proud of our girls today!! \uD83E\uDD79\uD83C\uDFD0"
          borderColor="orange"
          image="/images/team-celebration.jpg"
          reactions={[{ emoji: "\u2764\uFE0F", count: 18 }]}
          comments={5}
        />

        {/* Pinned announcement */}
        <PostCard
          avatar="CC"
          author="Coach Carlos"
          time="3 days ago"
          content="Tournament Packing List — March 8th. Coach Carlos posted the official packing list and arrival times for the Dallas tournament. Tap to view details."
          borderColor="navy"
          badge={"\uD83D\uDCCC PINNED"}
          badgeColor="bg-navy/10 text-navy"
          reactions={[]}
          comments={2}
        >
          <button className="text-[10px] font-bold text-teal hover:text-teal/80 transition-colors mb-1">
            {"View Details →"}
          </button>
        </PostCard>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-16 right-4 z-30">
        <button
          className="w-14 h-14 rounded-full bg-teal text-card shadow-lg hover:bg-teal/90 transition-colors flex items-center justify-center hover:shadow-xl"
          aria-label="Create new post"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      <BottomNav active="chat" />
    </div>
  )
}
