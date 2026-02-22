"use client"

import { cn } from "@/lib/utils"

interface PillTabsProps {
  tabs: string[]
  activeTab: number
  onTabChange?: (index: number) => void
}

export function PillTabs({ tabs, activeTab, onTabChange }: PillTabsProps) {
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2">
      <div className="flex items-center bg-[#E8F0F5] rounded-full p-1">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            onClick={() => onTabChange?.(index)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
              index === activeTab
                ? "bg-steel-blue text-card shadow-sm"
                : "text-muted-foreground hover:text-navy"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}
