import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// LYNX — Interactive Scroll-Driven Parent Home v2
// Updated with Carlos's feedback:
// - Calendar appears earlier
// - Taller welcome with cycling contextual messages
// - Animated mascot states
// - Player card expansion with real stats
// - Team Hub / Chat / Record expand on slow scroll
// - Dynamic balance card
// - Better spacing top-to-bottom
// ============================================================

const C = {
  navy: "#10284C",
  navyDeep: "#0D1B3E",
  sky: "#4BB9EC",
  skyLight: "#6AC4EE",
  gold: "#FFD700",
  goldWarm: "#D9994A",
  white: "#FFFFFF",
  offWhite: "#F6F8FB",
  border: "#E8ECF2",
  text: "#10284C",
  muted: "rgba(16,40,76,0.4)",
  faint: "rgba(16,40,76,0.25)",
  success: "#22C55E",
  error: "#EF4444",
};

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// Contextual messages that cycle — spoken by the mascot
const MASCOT_MESSAGES = [
  { text: "Coach needs a headcount.\nIs Ava playing Saturday?", mood: "curious", icon: "🤔" },
  { text: "Final buzzer for registration fees\nis April 12th. Secure Ava's spot!", mood: "urgent", icon: "⏰" },
  { text: "Ava earned a new badge yesterday!\nShe's on a roll 🔥", mood: "excited", icon: "🎉" },
];

export default function LynxScrollV2() {
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgFade, setMsgFade] = useState(1);
  const lastY = useRef(0);
  const lastT = useRef(Date.now());
  const navTimer = useRef(null);
  const velBuf = useRef([]);

  // Cycle mascot messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgFade(0);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % MASCOT_MESSAGES.length);
        setMsgFade(1);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const y = scrollRef.current.scrollTop;
    const now = Date.now();
    const dt = now - lastT.current;
    const dy = Math.abs(y - lastY.current);
    const v = dt > 0 ? (dy / dt) * 1000 : 0;
    velBuf.current.push(v);
    if (velBuf.current.length > 6) velBuf.current.shift();
    const avg = velBuf.current.reduce((a, b) => a + b, 0) / velBuf.current.length;

    setScrollY(y);
    setVelocity(avg);

    if (dy > 2) {
      setNavVisible(false);
      clearTimeout(navTimer.current);
      navTimer.current = setTimeout(() => setNavVisible(true), 900);
    }
    lastY.current = y;
    lastT.current = now;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", onScroll, { passive: true });
    return () => { if (el) el.removeEventListener("scroll", onScroll); clearTimeout(navTimer.current); };
  }, [onScroll]);

  // === SCROLL DERIVED VALUES ===
  const welcomeP = Math.min(scrollY / 140, 1); // collapse over 140px (faster)
  const calP = Math.min(Math.max((scrollY - 30) / 80, 0), 1); // calendar starts at 30px, done by 110px
  const eventImgP = Math.min(Math.max((scrollY - 150) / 120, 0), 1);
  const slow = velocity < 350;

  const mascotScale = lerp(1, 0, welcomeP);
  const mascotOp = lerp(1, 0, welcomeP);
  const welcomeOp = lerp(1, 0, welcomeP);
  const welcomeH = lerp(280, 0, welcomeP); // taller welcome
  const headerOp = welcomeP;

  const msg = MASCOT_MESSAGES[msgIndex];

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #070E1B 0%, #0D1B3E 50%, #070E1B 100%)",
      padding: "28px 16px",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        .ls::-webkit-scrollbar{display:none}.ls{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes wiggle{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.sky, letterSpacing: "0.2em" }}>
            LYNX · INTERACTIVE PROTOTYPE v2
          </div>
          <div style={{ fontSize: 28, color: "#EEF4FF", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>
            SCROLL-DRIVEN PARENT HOME
          </div>
          <div style={{ fontSize: 12, color: "#5B7494", marginTop: 4 }}>
            Scroll inside the phone · Watch everything respond
          </div>
        </div>

        {/* ====== PHONE ====== */}
        <div style={{
          width: 390, height: 844, borderRadius: 48,
          border: "3px solid #1E293B", background: C.offWhite,
          overflow: "hidden", position: "relative",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: 126, height: 34, borderRadius: 17, background: "#000", zIndex: 50,
          }} />

          {/* ====== STICKY COMPACT HEADER ====== */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 40,
            background: `rgba(246,248,251,${Math.min(welcomeP * 1.5, 0.97)})`,
            backdropFilter: welcomeP > 0.2 ? "blur(20px)" : "none",
            borderBottom: welcomeP > 0.4 ? `1px solid ${C.border}` : "1px solid transparent",
            padding: "54px 20px 0",
            transition: "border-bottom 0.3s",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              height: 42, opacity: headerOp,
              transform: `translateY(${lerp(8, 0, welcomeP)}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🐱</span>
                <span style={{
                  fontSize: 17, fontWeight: 800, color: C.navy,
                  fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.06em",
                }}>LYNX</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ fontSize: 16 }}>🔔</span>
                  <div style={{
                    position: "absolute", top: -4, right: -6,
                    width: 14, height: 14, borderRadius: 7,
                    background: C.error, color: "#fff", fontSize: 8, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>3</div>
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.navy}, ${C.sky})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                }}>CT</div>
              </div>
            </div>

            {/* ====== DAY STRIP — appears by 110px scroll ====== */}
            <div style={{
              overflow: "hidden",
              maxHeight: calP > 0.05 ? 56 : 0,
              opacity: calP,
              transform: `translateY(${lerp(15, 0, calP)}px)`,
              transition: "max-height 0.3s ease, opacity 0.25s ease",
              marginTop: calP > 0.05 ? 2 : 0,
              paddingBottom: calP > 0.05 ? 10 : 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
                  const isToday = i === 2;
                  const hasEvent = i === 2 || i === 5;
                  return (
                    <div key={d} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 2, padding: "5px 8px", borderRadius: 14,
                      background: isToday ? C.sky : "transparent", cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? "rgba(255,255,255,0.8)" : C.faint }}>{d}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? "#fff" : C.text }}>{17 + i}</span>
                      {hasEvent && <div style={{ width: 4, height: 4, borderRadius: 2, background: isToday ? "#fff" : C.sky }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ====== SCROLLABLE CONTENT ====== */}
          <div ref={scrollRef} className="ls" style={{
            height: "100%", overflowY: "auto", overflowX: "hidden", position: "relative",
          }}>
            <div style={{ height: 54 }} />

            {/* ====== WELCOME SECTION ====== */}
            <div style={{ overflow: "hidden", height: welcomeH, transition: "height 0.05s linear" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", padding: "16px 28px 0",
              }}>
                {/* Mascot with mood-based animation */}
                <div style={{
                  width: 96, height: 96, borderRadius: 48,
                  background: "linear-gradient(135deg, #E8F4FD, #D4EDFA)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                  transform: `scale(${mascotScale})`,
                  opacity: mascotOp,
                  border: "3px solid rgba(75,185,236,0.15)",
                  animation: mascotOp > 0.5
                    ? (msg.mood === "curious" ? "wiggle 2s ease-in-out infinite"
                      : msg.mood === "urgent" ? "bounce 1.5s ease-in-out infinite"
                      : "float 3s ease-in-out infinite")
                    : "none",
                }}>
                  <span style={{ fontSize: 48 }}>🐱</span>
                </div>

                {/* Greeting */}
                <div style={{ opacity: welcomeOp }}>
                  <div style={{ fontSize: 14, color: C.muted, fontWeight: 500, marginBottom: 4 }}>
                    Welcome back,
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 800, color: C.text,
                    letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 14,
                  }}>Sarah Johnson</div>

                  {/* Cycling contextual message */}
                  <div style={{
                    background: C.white, borderRadius: 16,
                    padding: "12px 18px",
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
                    opacity: msgFade,
                    transition: "opacity 0.4s ease",
                    maxWidth: 300,
                    position: "relative",
                  }}>
                    {/* Speech bubble tail */}
                    <div style={{
                      position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                      width: 12, height: 12, borderRadius: 2,
                      background: C.white, border: `1px solid ${C.border}`,
                      borderBottom: "none", borderRight: "none",
                      transform: "translateX(-50%) rotate(45deg)",
                    }} />
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 20, flexShrink: 0, marginTop: -2 }}>{msg.icon}</span>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: C.text,
                        lineHeight: 1.45, textAlign: "left",
                        whiteSpace: "pre-line",
                      }}>{msg.text}</div>
                    </div>
                    {/* Dots indicator */}
                    <div style={{
                      display: "flex", gap: 4, justifyContent: "center", marginTop: 8,
                    }}>
                      {MASCOT_MESSAGES.map((_, i) => (
                        <div key={i} style={{
                          width: i === msgIndex ? 16 : 5, height: 5, borderRadius: 3,
                          background: i === msgIndex ? C.sky : C.border,
                          transition: "all 0.3s ease",
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bell (visible in welcome state) */}
            <div style={{
              position: "absolute", top: 62, right: 20,
              opacity: 1 - welcomeP, zIndex: 30,
              transform: `scale(${lerp(1, 0.7, welcomeP)})`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: "#fff", border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative",
              }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <div style={{
                  position: "absolute", top: -2, right: -2,
                  width: 16, height: 16, borderRadius: 8,
                  background: C.error, color: "#fff", fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${C.offWhite}`,
                }}>3</div>
              </div>
            </div>

            {/* ====== MAIN CONTENT ====== */}
            <div style={{ padding: "16px 20px 100px" }}>

              {/* EVENT HERO CARD */}
              <div style={{
                borderRadius: 22, overflow: "hidden", marginBottom: 16,
                position: "relative",
                boxShadow: "0 4px 24px rgba(16,40,76,0.15)",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(135deg, ${C.navyDeep}, #0F2847)`,
                }}>
                  {/* Sky reveal */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg,
                      rgba(135,206,235,${eventImgP * 0.35}) 0%,
                      rgba(100,180,220,${eventImgP * 0.2}) 25%,
                      rgba(60,120,180,${eventImgP * 0.1}) 45%,
                      rgba(15,40,71,0.97) 75%,
                      rgba(13,27,62,1) 100%)`,
                    transition: "all 0.3s ease",
                  }} />
                  {/* Cloud hints */}
                  {eventImgP > 0.3 && (
                    <>
                      <div style={{
                        position: "absolute", top: 25, left: 30,
                        width: 80, height: 30, borderRadius: 15,
                        background: `rgba(255,255,255,${eventImgP * 0.08})`,
                        filter: "blur(8px)",
                      }} />
                      <div style={{
                        position: "absolute", top: 15, right: 50,
                        width: 60, height: 20, borderRadius: 10,
                        background: `rgba(255,255,255,${eventImgP * 0.06})`,
                        filter: "blur(6px)",
                      }} />
                    </>
                  )}
                  {/* Volleyball */}
                  <div style={{
                    position: "absolute", top: 18, right: 22,
                    fontSize: 32, opacity: lerp(0.08, 0.25, eventImgP),
                    transition: "opacity 0.4s ease",
                  }}>🏐</div>
                </div>
                <div style={{
                  position: "relative", zIndex: 2,
                  padding: "24px 22px 20px", minHeight: 190,
                  display: "flex", flexDirection: "column", justifyContent: "flex-end",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: 4, background: C.success,
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: C.sky,
                      letterSpacing: "0.12em",
                    }}>TODAY · 6:00 PM</span>
                  </div>
                  <div style={{
                    fontSize: 36, fontWeight: 800, color: "#fff",
                    fontFamily: "'Bebas Neue', sans-serif",
                    letterSpacing: "0.04em", lineHeight: 1, marginBottom: 4,
                  }}>PRACTICE</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>
                    📍 Frisco Fieldhouse
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>
                    Black Hornets Elite
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{
                      flex: 1, padding: "12px 0", borderRadius: 14,
                      background: C.sky, color: C.navyDeep,
                      textAlign: "center", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>RSVP</div>
                    <div style={{
                      flex: 1, padding: "12px 0", borderRadius: 14,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>Directions</div>
                  </div>
                </div>
              </div>

              {/* ATTENTION BANNER */}
              <div style={{
                background: "#FFF8ED", borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
                border: "1px solid #FDEDC8", marginBottom: 16, cursor: "pointer",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: C.goldWarm, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                }}>2</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>
                  2 things need attention
                </span>
                <span style={{ color: C.faint, fontSize: 18 }}>›</span>
              </div>

              {/* ATHLETE CARD — expands on slow scroll */}
              <ExpandingAthleteCard scrollY={scrollY} slow={slow} />

              {/* METRIC GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {/* Record — expands */}
                <ExpandingRecord scrollY={scrollY} slow={slow} />
                {/* Balance — dynamic */}
                <DynamicBalance />
                {/* Progress */}
                <div style={{
                  background: "#fff", borderRadius: 18, padding: "16px 14px",
                  border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>⭐</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: "0.1em" }}>PROGRESS</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                    750<span style={{ fontSize: 14, color: C.faint }}>/800</span>
                  </div>
                  <div style={{
                    width: "100%", height: 5, borderRadius: 3, background: C.border, marginTop: 8, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: "93.75%",
                      background: `linear-gradient(90deg, ${C.sky}, ${C.gold})`,
                    }} />
                  </div>
                </div>
                {/* Chat — expands */}
                <ExpandingChat scrollY={scrollY} slow={slow} />
              </div>

              {/* TEAM HUB — expands on slow scroll */}
              <ExpandingTeamHub scrollY={scrollY} slow={slow} />

              {/* SEASON SNAPSHOT */}
              <div style={{
                background: "#fff", borderRadius: 18, padding: "18px 20px",
                border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: "0.1em", marginBottom: 14 }}>
                  SEASON SNAPSHOT
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: C.success, fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>6</div>
                    <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, marginTop: 4 }}>Wins</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: C.border }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: C.error, fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}>1</div>
                    <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, marginTop: 4 }}>Loss</div>
                  </div>
                  <div style={{ flex: 1.2, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Latest Game</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'Bebas Neue', sans-serif" }}>WON 50-12</div>
                  </div>
                </div>
              </div>

              {/* BADGES */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: "0.1em", marginBottom: 10 }}>
                  RECENT BADGES
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["🎺 Hype Machine", "📣 First Shoutout", "⚔️ First Blood"].map((b, i) => (
                    <div key={i} style={{
                      padding: "8px 14px", borderRadius: 12,
                      background: "#fff", border: `1px solid ${C.border}`,
                      fontSize: 12, fontWeight: 600, color: C.text,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                    }}>{b}</div>
                  ))}
                </div>
              </div>

              {/* Mascot end */}
              <div style={{ textAlign: "center", padding: "24px 0 40px", opacity: 0.35 }}>
                <span style={{ fontSize: 32 }}>🐱</span>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>That's everything for now!</div>
              </div>
            </div>
          </div>

          {/* ====== BOTTOM NAV ====== */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 78,
            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
            borderTop: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-around",
            padding: "0 12px 10px",
            transform: `translateY(${navVisible ? 0 : 100}px)`,
            transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 45,
          }}>
            {[
              { icon: "⌂", label: "Home", active: true },
              { icon: "📅", label: "Schedule" },
              { icon: "💬", label: "Chat", badge: 7 },
              { icon: "≡", label: "More", badge: 12 },
            ].map((t, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, position: "relative", cursor: "pointer",
                opacity: t.active ? 1 : 0.35,
              }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: t.active ? 700 : 600,
                  color: t.active ? C.sky : C.text,
                }}>{t.label}</span>
                {t.badge && (
                  <div style={{
                    position: "absolute", top: -4, right: -10,
                    background: C.error, color: "#fff", fontSize: 9, fontWeight: 700,
                    borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center",
                  }}>{t.badge}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hints */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          {[
            "🐱 Mascot animates per alert type",
            "💬 Messages cycle every 5s",
            "📅 Calendar appears early",
            "🏐 Sky reveals on scroll",
            "🐌 Scroll slowly past cards to expand",
            "⬇ Nav hides while scrolling",
          ].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, color: "#5B7494", fontWeight: 500,
              background: "rgba(75,185,236,0.06)", padding: "4px 10px",
              borderRadius: 8, border: "1px solid rgba(75,185,236,0.1)",
            }}>{h}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPANDING ATHLETE CARD
// ============================================================
function ExpandingAthleteCard({ scrollY, slow }) {
  const show = slow && scrollY > 300 && scrollY < 550;
  return (
    <div style={{
      background: "#fff", borderRadius: 20, border: `1px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(16,40,76,0.05)", marginBottom: 16,
      overflow: "hidden", cursor: "pointer",
      transform: `scale(${show ? 1.015 : 1})`,
      transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #C41E3A, #8B1528)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.4)", fontSize: 20, fontWeight: 800,
            fontFamily: "'Bebas Neue', sans-serif", flexShrink: 0,
          }}>13</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sky, letterSpacing: "0.1em", marginBottom: 2 }}>MY ATHLETE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>Ava</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Black Hornets Elite · Setter · #1</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(255,215,0,0.1)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>LVL 4</span>
          </div>
        </div>
      </div>
      {/* Expanding stats */}
      <div style={{
        maxHeight: show ? 90 : 0, opacity: show ? 1 : 0, overflow: "hidden",
        transition: "max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
        borderTop: show ? `1px solid ${C.border}` : "1px solid transparent",
      }}>
        <div style={{ padding: "14px 18px", display: "flex", gap: 0 }}>
          {[
            { v: "56", l: "OVR", c: C.text },
            { v: "100%", l: "HIT %", c: C.success },
            { v: "100%", l: "SERVE", c: C.sky },
            { v: "22", l: "ASSISTS", c: C.sky },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderRight: i < 3 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: C.faint, fontWeight: 700, letterSpacing: "0.05em", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPANDING RECORD CARD
// ============================================================
function ExpandingRecord({ scrollY, slow }) {
  const show = slow && scrollY > 500 && scrollY < 750;
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: "16px 14px",
      border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
      overflow: "hidden", cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>🏆</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: "0.1em" }}>RECORD</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>6-1</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.success, marginTop: 4 }}>Won 50-12</div>
      {/* Expanding detail */}
      <div style={{
        maxHeight: show ? 50 : 0, opacity: show ? 1 : 0, overflow: "hidden",
        transition: "max-height 0.4s ease, opacity 0.3s ease",
      }}>
        <div style={{
          fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 6,
        }}>
          Ava: 22 assists, 100% serve<br />
          vs Allen Eagles · Feb 24
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC BALANCE CARD
// ============================================================
function DynamicBalance() {
  const hasBalance = true; // toggle this
  if (!hasBalance) return (
    <div style={{
      background: "#F0FDF4", borderRadius: 18, padding: "16px 14px",
      border: "1px solid #BBF7D0",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 13 }}>✅</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.success, marginLeft: 6 }}>All caught up!</span>
    </div>
  );
  return (
    <div style={{
      background: "#FFF8ED", borderRadius: 18, padding: "16px 14px",
      border: "1px solid #FDEDC8", cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>💳</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.goldWarm, letterSpacing: "0.1em" }}>BALANCE</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>$210</div>
      <div style={{ fontSize: 10, color: C.goldWarm, fontWeight: 600, marginTop: 4 }}>
        Due Apr 12 · Tap to pay
      </div>
    </div>
  );
}

// ============================================================
// EXPANDING CHAT CARD
// ============================================================
function ExpandingChat({ scrollY, slow }) {
  const show = slow && scrollY > 520 && scrollY < 780;
  return (
    <div style={{
      background: C.navyDeep, borderRadius: 18, padding: "16px 14px",
      border: "1px solid rgba(75,185,236,0.08)", cursor: "pointer", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>💬</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>CHAT</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 2 }}>Team Chat</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>1 unread</div>
      <div style={{
        marginTop: 8, width: 20, height: 20, borderRadius: 10,
        background: C.sky, color: C.navyDeep, fontSize: 10, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>1</div>
      {/* Expanding preview */}
      <div style={{
        maxHeight: show ? 44 : 0, opacity: show ? 1 : 0, overflow: "hidden",
        transition: "max-height 0.4s ease, opacity 0.3s ease",
      }}>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8,
          borderTop: "1px solid rgba(75,185,236,0.1)", paddingTop: 8, lineHeight: 1.4,
        }}>
          Carlos: "Reminder — bring<br />knee pads tomorrow!"
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPANDING TEAM HUB
// ============================================================
function ExpandingTeamHub({ scrollY, slow }) {
  const show = slow && scrollY > 650 && scrollY < 900;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: "0.1em" }}>TEAM HUB</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.sky, cursor: "pointer" }}>View All</span>
      </div>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "16px",
        border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(16,40,76,0.04)",
        cursor: "pointer", overflow: "hidden",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(255,215,0,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
              Coach Carlos gave Ava a <span style={{ color: C.sky, fontWeight: 700 }}>Clutch Player</span> shoutout!
            </div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>1 day ago</div>
          </div>
        </div>
        {/* Expanding extra posts */}
        <div style={{
          maxHeight: show ? 70 : 0, opacity: show ? 1 : 0, overflow: "hidden",
          transition: "max-height 0.4s ease, opacity 0.3s ease",
        }}>
          <div style={{
            borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12,
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: "rgba(75,185,236,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>📸</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                New photos from last practice
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>2 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
