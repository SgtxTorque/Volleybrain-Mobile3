import { Home, Calendar, MessageCircle, Trophy, MoreHorizontal } from "lucide-react"

type ActiveTab = "home" | "calendar" | "chat" | "trophy" | "more"

export function BottomNav({ active }: { active: ActiveTab }) {
  const items = [
    { id: "home" as const, icon: Home },
    { id: "calendar" as const, icon: Calendar },
    { id: "chat" as const, icon: MessageCircle },
    { id: "trophy" as const, icon: Trophy },
    { id: "more" as const, icon: MoreHorizontal },
  ]

  return (
    <div className="sticky bottom-0 z-40 flex items-center justify-around bg-card/95 backdrop-blur-sm px-4 py-3 border-t border-border">
      {items.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className="flex items-center justify-center w-10 h-10"
          aria-label={id}
        >
          <Icon
            size={22}
            className={
              active === id
                ? "text-steel-blue fill-steel-blue"
                : "text-muted-foreground"
            }
            strokeWidth={active === id ? 2.5 : 1.5}
          />
        </button>
      ))}
    </div>
  )
}
