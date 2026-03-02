import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// LYNX — Interactive Scroll-Driven Parent Home
// Fuses V1 (mascot welcome) + V3 (day strip + cards)
// with scroll-linked animations throughout
// ============================================================

const COLORS = {
  navy: "#10284C",
  navyDeep: "#0D1B3E",
  sky: "#4BB9EC",
  skyLight: "#6AC4EE",
  gold: "#FFD700",
  goldWarm: "#D9994A",
  white: "#FFFFFF",
  offWhite: "#F6F8FB",
  border: "#E8ECF2",
  textPrimary: "#10284C",
  textMuted: "rgba(16,40,76,0.4)",
  success: "#22C55E",
  error: "#EF4444",
  teal: "#14B8A6",
};

// Smooth interpolation helper
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

export default function LynxScrollDriven() {
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const navTimeout = useRef(null);
  const velocityHistory = useRef([]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const y = scrollRef.current.scrollTop;
    const now = Date.now();
    const dt = now - lastScrollTime.current;
    const dy = Math.abs(y - lastScrollY.current);
    
    // Calculate velocity (pixels per second)
    const v = dt > 0 ? (dy / dt) * 1000 : 0;
    velocityHistory.current.push(v);
    if (velocityHistory.current.length > 5) velocityHistory.current.shift();
    const avgVelocity = velocityHistory.current.reduce((a, b) => a + b, 0) / velocityHistory.current.length;

    setScrollY(y);
    setScrollVelocity(avgVelocity);

    // Hide nav on scroll, show when stopped
    if (dy > 2) {
      setNavVisible(false);
      clearTimeout(navTimeout.current);
      navTimeout.current = setTimeout(() => setNavVisible(true), 800);
    }

    lastScrollY.current = y;
    lastScrollTime.current = now;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
      clearTimeout(navTimeout.current);
    };
  }, [handleScroll]);

  // Scroll-derived values
  const welcomeProgress = Math.min(scrollY / 180, 1); // 0-1 over first 180px
  const calendarProgress = Math.min(Math.max((scrollY - 80) / 100, 0), 1);
  const eventImageProgress = Math.min(Math.max((scrollY - 200) / 150, 0), 1);
  const isSlowScroll = scrollVelocity < 400;

  // Welcome section transforms
  const mascotScale = lerp(1, 0, welcomeProgress);
  const mascotOpacity = lerp(1, 0, welcomeProgress);
  const welcomeTextOpacity = lerp(1, 0, welcomeProgress);
  const welcomeHeight = lerp(220, 0, welcomeProgress);
  const headerCompactOpacity = welcomeProgress;

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #070E1B 0%, #0D1B3E 50%, #070E1B 100%)",
      padding: "32px 16px",
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Import fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        
        .lynx-scroll::-webkit-scrollbar { display: none; }
        .lynx-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Label */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: COLORS.sky,
            letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
          }}>LYNX · INTERACTIVE PROTOTYPE</div>
          <div style={{
            fontSize: 32, fontWeight: 400, color: "#EEF4FF",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.08em",
          }}>SCROLL-DRIVEN PARENT HOME</div>
          <div style={{
            fontSize: 12, color: "#5B7494", marginTop: 6,
          }}>Scroll inside the phone to experience the interactions</div>
        </div>

        {/* Phone Frame */}
        <div style={{
          width: 390, height: 844,
          borderRadius: 48,
          border: "3px solid #1E293B",
          background: COLORS.offWhite,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: 126, height: 34, borderRadius: 17,
            background: "#000", zIndex: 50,
          }} />

          {/* ====== STICKY COMPACT HEADER (appears on scroll) ====== */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            zIndex: 40,
            background: `rgba(246,248,251,${Math.min(welcomeProgress * 1.5, 0.97)})`,
            backdropFilter: welcomeProgress > 0.3 ? "blur(20px)" : "none",
            borderBottom: welcomeProgress > 0.5 ? `1px solid ${COLORS.border}` : "1px solid transparent",
            padding: "54px 20px 0 20px",
            transition: "border-bottom 0.3s ease",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              height: 44,
              opacity: headerCompactOpacity,
              transform: `translateY(${lerp(10, 0, welcomeProgress)}px)`,
              transition: "opacity 0.15s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🐱</span>
                <span style={{
                  fontSize: 18, fontWeight: 800, color: COLORS.navy,
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "0.06em",
                }}>LYNX</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: COLORS.textPrimary,
                }}>Sarah</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.sky})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                }}>CT</div>
              </div>
            </div>

            {/* ====== DAY STRIP (slides in from below) ====== */}
            <div style={{
              overflow: "hidden",
              maxHeight: calendarProgress > 0.1 ? 56 : 0,
              opacity: calendarProgress,
              transform: `translateY(${lerp(20, 0, calendarProgress)}px)`,
              transition: "max-height 0.4s ease, opacity 0.3s ease",
              marginTop: calendarProgress > 0.1 ? 4 : 0,
              paddingBottom: calendarProgress > 0.1 ? 10 : 0,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", padding: "0 4px",
              }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                  const isToday = i === 2; // Wednesday
                  const hasEvent = i === 2;
                  const num = 17 + i;
                  return (
                    <div key={d} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 2, padding: "6px 8px", borderRadius: 14,
                      background: isToday ? COLORS.sky : "transparent",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: isToday ? "rgba(255,255,255,0.8)" : "rgba(16,40,76,0.3)",
                      }}>{d}</span>
                      <span style={{
                        fontSize: 15, fontWeight: 700,
                        color: isToday ? "#fff" : COLORS.textPrimary,
                      }}>{num}</span>
                      {hasEvent && (
                        <div style={{
                          width: 4, height: 4, borderRadius: 2,
                          background: isToday ? "#fff" : COLORS.sky,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ====== SCROLLABLE CONTENT ====== */}
          <div
            ref={scrollRef}
            className="lynx-scroll"
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}
          >
            {/* Spacer for status bar */}
            <div style={{ height: 54 }} />

            {/* ====== WELCOME SECTION (collapses on scroll) ====== */}
            <div style={{
              overflow: "hidden",
              height: welcomeHeight,
              opacity: 1,
              transition: "height 0.05s linear",
            }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", padding: "16px 20px 0",
              }}>
                {/* Mascot */}
                <div style={{
                  width: 88, height: 88, borderRadius: 44,
                  background: "linear-gradient(135deg, #E8F4FD, #D4EDFA)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                  transform: `scale(${mascotScale})`,
                  opacity: mascotOpacity,
                  border: "3px solid rgba(75,185,236,0.15)",
                  animation: mascotOpacity > 0.5 ? "float 3s ease-in-out infinite" : "none",
                }}>
                  <span style={{ fontSize: 44 }}>🐱</span>
                </div>
                {/* Welcome text */}
                <div style={{ opacity: welcomeTextOpacity }}>
                  <div style={{
                    fontSize: 14, color: "rgba(16,40,76,0.4)", fontWeight: 500,
                    marginBottom: 4,
                  }}>Welcome back,</div>
                  <div style={{
                    fontSize: 30, fontWeight: 800, color: COLORS.textPrimary,
                    letterSpacing: "-0.02em", lineHeight: 1.1,
                  }}>Sarah Johnson</div>
                </div>
              </div>
            </div>

            {/* ====== NOTIFICATION BELL (visible in welcome state) ====== */}
            <div style={{
              position: "absolute", top: 62, right: 20,
              opacity: 1 - welcomeProgress,
              transform: `scale(${lerp(1, 0.8, welcomeProgress)})`,
              transition: "opacity 0.2s ease",
              zIndex: 30,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: "#fff", border: `1px solid ${COLORS.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                position: "relative",
              }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <div style={{
                  position: "absolute", top: -2, right: -2,
                  width: 16, height: 16, borderRadius: 8,
                  background: COLORS.error, color: "#fff",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${COLORS.offWhite}`,
                }}>3</div>
              </div>
            </div>

            {/* Content padding top adjusts based on welcome collapse */}
            <div style={{ padding: "12px 20px 100px 20px" }}>

              {/* ====== NEXT EVENT — HERO CARD ====== */}
              <div style={{
                borderRadius: 22,
                overflow: "hidden",
                marginBottom: 16,
                position: "relative",
                transform: `scale(${isSlowScroll && scrollY > 180 ? 1 : lerp(0.97, 1, Math.min(scrollY / 100, 1))})`,
                transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {/* Background — reveals on scroll */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(135deg, ${COLORS.navyDeep} 0%, #0F2847 100%)`,
                }}>
                  {/* Photo that reveals */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(135,195,230,0.3) 0%, rgba(70,130,180,0.2) 40%, rgba(15,23,42,0.9) 100%)",
                    opacity: eventImageProgress,
                    transition: "opacity 0.5s ease",
                  }} />
                  {/* Volleyball silhouette overlay */}
                  <div style={{
                    position: "absolute", top: 20, right: 20,
                    width: 80, height: 80, borderRadius: 40,
                    background: "radial-gradient(circle, rgba(75,185,236,0.12) 0%, transparent 70%)",
                    opacity: eventImageProgress,
                    transition: "opacity 0.6s ease",
                  }}>
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 36, opacity: 0.3,
                    }}>🏐</div>
                  </div>
                  {/* Sky gradient that reveals */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg, 
                      rgba(135,206,235,${eventImageProgress * 0.25}) 0%, 
                      rgba(100,149,237,${eventImageProgress * 0.15}) 30%,
                      rgba(15,40,71,0.95) 70%, 
                      rgba(13,27,62,1) 100%)`,
                  }} />
                </div>
                <div style={{
                  position: "relative", zIndex: 2,
                  padding: "22px 22px 20px",
                  minHeight: 180,
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: 4,
                      background: COLORS.success,
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: COLORS.sky,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                    }}>TODAY · 6:00 PM</span>
                  </div>
                  <div style={{
                    fontSize: 34, fontWeight: 800, color: "#fff",
                    fontFamily: "'Bebas Neue', sans-serif",
                    letterSpacing: "0.04em", lineHeight: 1,
                    marginBottom: 4,
                  }}>PRACTICE</div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.45)",
                    display: "flex", alignItems: "center", gap: 5,
                    marginBottom: 4,
                  }}>
                    <span>📍</span> Frisco Fieldhouse
                  </div>
                  <div style={{
                    fontSize: 12, color: "rgba(255,255,255,0.3)",
                    marginBottom: 14,
                  }}>Black Hornets Elite</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{
                      flex: 1, padding: "11px 0", borderRadius: 14,
                      background: COLORS.sky, color: COLORS.navyDeep,
                      textAlign: "center", fontSize: 13, fontWeight: 700,
                      cursor: "pointer",
                    }}>RSVP</div>
                    <div style={{
                      flex: 1, padding: "11px 0", borderRadius: 14,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff", textAlign: "center",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>Directions</div>
                  </div>
                </div>
              </div>

              {/* ====== ATTENTION BANNER ====== */}
              <div style={{
                background: "#FFF8ED",
                borderRadius: 16, padding: "13px 16px",
                display: "flex", alignItems: "center", gap: 12,
                border: "1px solid #FDEDC8",
                marginBottom: 16,
                cursor: "pointer",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: COLORS.goldWarm, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                }}>2</div>
                <span style={{
                  flex: 1, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary,
                }}>2 things need attention</span>
                <span style={{ color: "rgba(16,40,76,0.3)", fontSize: 18 }}>›</span>
              </div>

              {/* ====== MY ATHLETE — EXPANDING CARD ====== */}
              <AthleteCard scrollY={scrollY} isSlowScroll={isSlowScroll} />

              {/* ====== METRIC GRID ====== */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, marginBottom: 16,
              }}>
                <MetricCard
                  icon="🏆" label="RECORD" value="6-1"
                  detail="Won 50-12" detailColor={COLORS.success}
                />
                <MetricCard
                  icon="💳" label="BALANCE" value="$210"
                  detail="Pay Now" detailColor={COLORS.sky} isLink
                />
                <MetricCard
                  icon="⭐" label="PROGRESS" value="750" sub="/800"
                  progress={93.75}
                />
                <div style={{
                  background: COLORS.navyDeep, borderRadius: 18,
                  padding: "16px 14px", cursor: "pointer",
                  border: "1px solid rgba(75,185,236,0.08)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 13 }}>💬</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                      letterSpacing: "0.1em",
                    }}>CHAT</span>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "#fff",
                    lineHeight: 1.3, marginBottom: 2,
                  }}>Team Chat</div>
                  <div style={{
                    fontSize: 11, color: "rgba(255,255,255,0.35)",
                  }}>1 unread</div>
                  <div style={{
                    marginTop: 8, width: 20, height: 20, borderRadius: 10,
                    background: COLORS.sky, color: COLORS.navyDeep,
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>1</div>
                </div>
              </div>

              {/* ====== TEAM HUB ====== */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: "rgba(16,40,76,0.3)",
                    letterSpacing: "0.1em",
                  }}>TEAM HUB</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: COLORS.sky, cursor: "pointer",
                  }}>View All</span>
                </div>
                <div style={{
                  background: "#fff", borderRadius: 18,
                  padding: "16px", border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
                  cursor: "pointer",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: "rgba(255,215,0,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>🎯</div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: COLORS.textPrimary,
                        lineHeight: 1.4,
                      }}>
                        Coach Carlos gave Ava a{" "}
                        <span style={{ color: COLORS.sky, fontWeight: 700 }}>Clutch Player</span>{" "}
                        shoutout!
                      </div>
                      <div style={{
                        fontSize: 11, color: "rgba(16,40,76,0.3)", marginTop: 4,
                      }}>1 day ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ====== SEASON SNAPSHOT ====== */}
              <div style={{
                background: "#fff", borderRadius: 18,
                padding: "18px 20px", border: `1px solid ${COLORS.border}`,
                boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(16,40,76,0.3)",
                  letterSpacing: "0.1em", marginBottom: 14,
                }}>SEASON SNAPSHOT</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 0,
                }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      fontSize: 36, fontWeight: 800, color: COLORS.success,
                      fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1,
                    }}>6</div>
                    <div style={{
                      fontSize: 11, color: "rgba(16,40,76,0.3)", fontWeight: 600, marginTop: 4,
                    }}>Wins</div>
                  </div>
                  <div style={{
                    width: 1, height: 40, background: COLORS.border,
                  }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      fontSize: 36, fontWeight: 800, color: COLORS.error,
                      fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1,
                    }}>1</div>
                    <div style={{
                      fontSize: 11, color: "rgba(16,40,76,0.3)", fontWeight: 600, marginTop: 4,
                    }}>Loss</div>
                  </div>
                  <div style={{ flex: 1.2, textAlign: "right" }}>
                    <div style={{
                      fontSize: 12, color: "rgba(16,40,76,0.3)", fontWeight: 500,
                    }}>Latest Game</div>
                    <div style={{
                      fontSize: 20, fontWeight: 800, color: COLORS.textPrimary,
                      fontFamily: "'Bebas Neue', sans-serif",
                    }}>WON 50-12</div>
                  </div>
                </div>
              </div>

              {/* ====== BALANCE ====== */}
              <div style={{
                background: "#FFF8ED", borderRadius: 18,
                padding: "16px 18px", border: "1px solid #FDEDC8",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16, cursor: "pointer",
              }}>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: COLORS.error,
                    letterSpacing: "0.06em", opacity: 0.7, marginBottom: 2,
                  }}>OUTSTANDING BALANCE</div>
                  <div style={{
                    fontSize: 24, fontWeight: 800, color: COLORS.textPrimary,
                  }}>$209.99</div>
                </div>
                <div style={{
                  padding: "10px 20px", borderRadius: 12,
                  background: COLORS.sky, color: COLORS.navyDeep,
                  fontSize: 13, fontWeight: 700,
                }}>Pay Now</div>
              </div>

              {/* ====== BADGES ====== */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(16,40,76,0.3)",
                  letterSpacing: "0.1em", marginBottom: 10,
                }}>RECENT BADGES</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["🎺 Hype Machine", "📣 First Shoutout", "⚔️ First Blood"].map((badge, i) => (
                    <div key={i} style={{
                      padding: "8px 14px", borderRadius: 12,
                      background: "#fff", border: `1px solid ${COLORS.border}`,
                      fontSize: 12, fontWeight: 600, color: COLORS.textPrimary,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                    }}>{badge}</div>
                  ))}
                </div>
              </div>

              {/* Mascot farewell */}
              <div style={{
                textAlign: "center", padding: "20px 0 40px",
                opacity: 0.4,
              }}>
                <span style={{ fontSize: 32 }}>🐱</span>
                <div style={{
                  fontSize: 12, color: "rgba(16,40,76,0.3)",
                  marginTop: 4, fontWeight: 500,
                }}>That's everything for now!</div>
              </div>
            </div>
          </div>

          {/* ====== BOTTOM NAV (hides on scroll, returns when stopped) ====== */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: 78,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-around",
            padding: "0 12px 10px",
            transform: `translateY(${navVisible ? 0 : 100}px)`,
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 45,
          }}>
            {[
              { icon: "⌂", label: "Home", active: true },
              { icon: "📅", label: "Schedule", active: false },
              { icon: "💬", label: "Chat", badge: 7, active: false },
              { icon: "≡", label: "More", badge: 12, active: false },
            ].map((t, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, position: "relative", cursor: "pointer",
                opacity: t.active ? 1 : 0.35,
              }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: t.active ? 700 : 600,
                  color: t.active ? COLORS.sky : COLORS.textPrimary,
                }}>{t.label}</span>
                {t.badge && (
                  <div style={{
                    position: "absolute", top: -4, right: -10,
                    background: COLORS.error, color: "#fff",
                    fontSize: 9, fontWeight: 700, borderRadius: 10,
                    padding: "1px 5px", minWidth: 16, textAlign: "center",
                  }}>{t.badge}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Interaction hints */}
        <div style={{
          display: "flex", gap: 20, marginTop: 12,
          flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            "↕ Scroll to morph welcome → header",
            "📅 Calendar slides in as you scroll",
            "🖼 Event card reveals sky on scroll",
            "⬇ Nav hides while scrolling",
          ].map((hint, i) => (
            <div key={i} style={{
              fontSize: 10, color: "#5B7494", fontWeight: 500,
              background: "rgba(75,185,236,0.06)",
              padding: "5px 10px", borderRadius: 8,
              border: "1px solid rgba(75,185,236,0.1)",
            }}>{hint}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ATHLETE CARD — Expands based on scroll proximity
// ============================================================
function AthleteCard({ scrollY, isSlowScroll }) {
  // Card grows slightly when user is scrolling slowly past it
  const cardScale = isSlowScroll && scrollY > 350 && scrollY < 600 ? 1.02 : 1;
  const showExtra = isSlowScroll && scrollY > 380 && scrollY < 580;

  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 16px rgba(16,40,76,0.05)",
      marginBottom: 16,
      overflow: "hidden",
      transform: `scale(${cardScale})`,
      transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      cursor: "pointer",
    }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, #C41E3A, #8B1528)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20, fontWeight: 800,
            fontFamily: "'Bebas Neue', sans-serif",
            flexShrink: 0,
          }}>13</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: COLORS.sky,
              letterSpacing: "0.1em", marginBottom: 2,
            }}>MY ATHLETE</div>
            <div style={{
              fontSize: 22, fontWeight: 800, color: COLORS.textPrimary,
              lineHeight: 1.1,
            }}>Ava</div>
            <div style={{
              fontSize: 12, color: "rgba(16,40,76,0.4)",
              marginTop: 2,
            }}>Black Hornets Elite · Setter · #1</div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 8,
            background: "rgba(255,215,0,0.1)",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: COLORS.gold,
            }}>LVL 4</span>
          </div>
        </div>
      </div>

      {/* Extra details that expand on slow scroll */}
      <div style={{
        maxHeight: showExtra ? 80 : 0,
        opacity: showExtra ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
        borderTop: showExtra ? `1px solid ${COLORS.border}` : "1px solid transparent",
      }}>
        <div style={{
          padding: "12px 18px",
          display: "flex", gap: 12,
        }}>
          <div style={{
            flex: 1, textAlign: "center",
            borderRight: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>56</div>
            <div style={{ fontSize: 10, color: "rgba(16,40,76,0.3)", fontWeight: 600 }}>OVR</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.success }}>100%</div>
            <div style={{ fontSize: 10, color: "rgba(16,40,76,0.3)", fontWeight: 600 }}>HIT %</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.sky }}>22</div>
            <div style={{ fontSize: 10, color: "rgba(16,40,76,0.3)", fontWeight: 600 }}>ASSISTS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// METRIC CARD — Reusable compact stat tile
// ============================================================
function MetricCard({ icon, label, value, sub, detail, detailColor, progress, isLink }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      padding: "16px 14px",
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
      cursor: "pointer",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
      }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "rgba(16,40,76,0.3)",
          letterSpacing: "0.1em",
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color: COLORS.textPrimary,
        lineHeight: 1,
      }}>
        {value}
        {sub && <span style={{
          fontSize: 14, color: "rgba(16,40,76,0.25)", fontWeight: 600,
        }}>{sub}</span>}
      </div>
      {detail && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: detailColor,
          marginTop: 4,
          cursor: isLink ? "pointer" : "default",
        }}>{detail}</div>
      )}
      {progress !== undefined && (
        <div style={{
          width: "100%", height: 5, borderRadius: 3,
          background: COLORS.border, marginTop: 8,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${COLORS.sky}, ${COLORS.gold})`,
          }} />
        </div>
      )}
    </div>
  );
}
