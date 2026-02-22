"use client"

import { ArrowLeft, SlidersHorizontal, ChevronLeft, ChevronRight, Check, Clock, X } from "lucide-react"
import { BottomNav } from "./bottom-nav"
import { PillTabs } from "./pill-tabs"
import { cn } from "@/lib/utils"

interface ScheduleCardProps {
  day: string
  dayOfWeek: string
  type: "practice" | "tournament" | "match"
  timeRange: string
  venue: string
  opponent?: string
  status: "confirmed" | "pending" | "declined"
}

const typeConfig = {
  practice: { label: "PRACTICE", color: "bg-teal text-card", border: "border-l-teal" },
  tournament: { label: "TOURNAMENT", color: "bg-orange text-card", border: "border-l-orange" },
  match: { label: "MATCH", color: "bg-navy text-card", border: "border-l-navy" },
}

const statusConfig = {
  confirmed: { icon: Check, color: "bg-teal/15 text-teal" },
  pending: { icon: Clock, color: "bg-orange/15 text-orange" },
  declined: { icon: X, color: "bg-coral/15 text-coral" },
}

function ScheduleCard({ day, dayOfWeek, type, timeRange, venue, opponent, status }: ScheduleCardProps) {
  const typeStyle = typeConfig[type]
  const statusStyle = statusConfig[status]
  const StatusIcon = statusStyle.icon

  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-l-4 mx-4 mb-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow",
        typeStyle.border
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Day number */}
        <div className="flex flex-col items-center min-w-[36px]">
          <span className="text-2xl font-extrabold text-navy leading-none">{day}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
            {dayOfWeek}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", typeStyle.color)}>
              {typeStyle.label}
            </span>
          </div>
          <p className="text-sm font-bold text-navy">{timeRange}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {opponent ? `vs. ${opponent} \u2022 ` : ""}{venue}
          </p>
        </div>

        {/* Status indicator */}
        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", statusStyle.color)}>
          <StatusIcon size={13} strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

export function FullSchedule() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button aria-label="Go back">
          <ArrowLeft size={20} className="text-navy" strokeWidth={2} />
        </button>
        <h1 className="text-sm font-extrabold uppercase tracking-widest text-navy">
          Schedule
        </h1>
        <button aria-label="Filters">
          <SlidersHorizontal size={18} className="text-navy" strokeWidth={2} />
        </button>
      </div>

      {/* Team tabs */}
      <PillTabs
        tabs={["Hornets 14U", "Hornets 16U", "All Teams"]}
        activeTab={0}
      />

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button aria-label="Previous month">
          <ChevronLeft size={18} className="text-navy" strokeWidth={2.5} />
        </button>
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-navy">
          March 2026
        </h2>
        <button aria-label="Next month">
          <ChevronRight size={18} className="text-navy" strokeWidth={2.5} />
        </button>
      </div>

      {/* Schedule cards */}
      <div className="pt-2 pb-4">
        <ScheduleCard
          day="1"
          dayOfWeek="SAT"
          type="practice"
          timeRange="9:00 AM — 11:00 AM"
          venue="Fieldhouse USA, Frisco TX"
          status="confirmed"
        />
        <ScheduleCard
          day="8"
          dayOfWeek="SAT"
          type="tournament"
          timeRange="8:00 AM — 6:00 PM"
          venue="Dallas Convention Center"
          status="pending"
        />
        <ScheduleCard
          day="15"
          dayOfWeek="SAT"
          type="match"
          timeRange="2:00 PM — 4:00 PM"
          venue="Home Court"
          opponent="North Dallas Spike"
          status="pending"
        />
        <ScheduleCard
          day="22"
          dayOfWeek="SAT"
          type="practice"
          timeRange="9:00 AM — 11:00 AM"
          venue="Fieldhouse USA"
          status="declined"
        />
        <ScheduleCard
          day="29"
          dayOfWeek="SAT"
          type="tournament"
          timeRange="8:00 AM — 5:00 PM"
          venue="Arlington Sports Complex"
          status="pending"
        />
      </div>

      <div className="flex-1" />

      {/* CTA Button */}
      <div className="px-4 pb-3">
        <button className="w-full py-3 bg-teal text-card text-xs font-bold uppercase tracking-widest rounded-full shadow-md hover:bg-teal/90 transition-colors">
          RSVP All Pending
        </button>
      </div>

      <BottomNav active="calendar" />
    </div>
  )
}
