import { cn } from "@/lib/utils"

interface MatchCardProps {
  homeTeam: string
  awayTeam: string
  time: string
  date?: string
  venue: string
  borderColor?: "teal" | "navy" | "orange" | "coral" | "steel"
  score?: { home: number; away: number }
}

const borderColors = {
  teal: "border-l-teal",
  navy: "border-l-navy",
  orange: "border-l-orange",
  coral: "border-l-coral",
  steel: "border-l-steel-blue",
}

export function MatchCard({
  homeTeam,
  awayTeam,
  time,
  date,
  venue,
  borderColor = "steel",
  score,
}: MatchCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-l-4 mx-4 mb-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow",
        borderColors[borderColor]
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-[#E8F0F5] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-navy">
            {homeTeam}
          </span>
        </div>

        {/* Score or Time */}
        <div className="flex flex-col items-center px-3">
          {score ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-steel-blue">
                {score.home}
              </span>
              <span className="text-xs text-muted-foreground font-medium">@</span>
              <span className="text-lg font-extrabold text-steel-blue">
                {score.away}
              </span>
            </div>
          ) : (
            <>
              <span className="text-lg font-extrabold text-steel-blue">
                {time}
              </span>
              {date && (
                <span className="text-[10px] text-muted-foreground">{date}</span>
              )}
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-xs font-bold uppercase tracking-wide text-navy">
            {awayTeam}
          </span>
          <div className="w-7 h-7 rounded-full bg-[#E8F0F5] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20" />
            </svg>
          </div>
        </div>
      </div>
      <div className="px-4 pb-2">
        <p className="text-[10px] text-muted-foreground text-center">{venue}</p>
      </div>
    </div>
  )
}
