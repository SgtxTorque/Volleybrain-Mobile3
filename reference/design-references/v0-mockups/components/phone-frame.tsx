"use client"

import type { ReactNode } from "react"

interface PhoneFrameProps {
  children: ReactNode
  label: string
  dark?: boolean
}

export function PhoneFrame({ children, label, dark = false }: PhoneFrameProps) {
  const statusBarColor = dark ? "#FFFFFF" : "#0D1B3E"
  return (
    <div className="flex flex-col items-center gap-4">
      {/* iPhone 15 Pro Frame */}
      <div className="relative w-[390px] h-[844px] rounded-[52px] bg-[#1a1a1a] p-[10px] shadow-[0_0_80px_rgba(75,185,236,0.1),0_20px_60px_rgba(0,0,0,0.6)]">
        {/* Inner bezel */}
        <div className={`relative w-full h-full rounded-[42px] overflow-hidden ${dark ? 'bg-[#0D1B3E]' : 'bg-[#F6F8FB]'}`}>
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 pt-3 pb-1 h-[52px]" style={{ color: statusBarColor }}>
            <span className="text-[14px] font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><path d="M1 4.2C2.8 2 5.2.8 8 .8s5.2 1.2 7 3.4c.3.4.3.9 0 1.2-1.8 2.2-4.2 3.4-7 3.4S2.8 7.6 1 5.4c-.3-.3-.3-.8 0-1.2z" opacity=".3"/><circle cx="8" cy="4.8" r="2.2"/></svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="0" width="3" height="12" rx="1" opacity=".3"/><rect x="4.5" y="3" width="3" height="9" rx="1" opacity=".5"/><rect x="9" y="1" width="3" height="11" rx="1" opacity=".7"/><rect x="13" y="0" width="3" height="12" rx="1"/></svg>
              <svg width="27" height="12" viewBox="0 0 27 12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" opacity=".35"/><rect x="23" y="4" width="2" height="4" rx="1" opacity=".35"/><rect x="1.5" y="2.5" width="17" height="7" rx="1.5"/></svg>
            </div>
          </div>

          {/* Dynamic Island */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-50 w-[126px] h-[36px] bg-black rounded-full" />

          {/* Scrollable Content */}
          <div className="phone-scroll w-full h-full overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>

      {/* Label */}
      <p className="text-[13px] font-bold tracking-[0.15em] uppercase text-[rgba(255,255,255,0.4)]">
        {label}
      </p>
    </div>
  )
}
