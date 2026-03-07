# Lynx Platform Parity Checklist

Last updated: 2026-03-07

## Feature Parity: Web vs Mobile

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| **Auth & Onboarding** |
| Login / Signup | Y | Y | |
| Role-based dashboards | Y | Y | |
| Pending approval flow | Y | Y | |
| COPPA parental consent | N | Y | Mobile-only |
| **Schedule & Events** |
| Calendar view | Y | Y | |
| Event creation | Y | Y | |
| Bulk event creation | Y | Y | Mobile added via bulk-event-create |
| RSVP | Y | Y | |
| Event detail modal | Y | Y | |
| **Game Day** |
| Game Day Command Center | N | Y | Mobile-first courtside tool |
| Live scoring / rally tracking | N | Y | |
| Serve tracker | N | Y | |
| Lineup builder | Y | Y | |
| Attendance | Y | Y | |
| Game results entry | Y | Y | |
| Game prep wizard | N | Y | Mobile-first |
| Game recap | N | Y | Mobile-first |
| **Chat & Communication** |
| Team chat | Y | Y | |
| Direct messages | N | N | H3 planned |
| Blast composer | Y | Y | |
| Blast history | Y | Y | |
| **Team Hub / Social** |
| Team Wall posts | Y | Y | |
| Photo gallery | Y | Y | |
| Shoutouts | Y | Y | |
| Hero banner carousel | N | Y | Mobile Team Hub redesign |
| **Player Identity** |
| Trading card | N | Y | Mobile-first |
| Roster carousel | N | Y | Mobile-first |
| OVR badge / power bars | Y | Y | Web has basic profile |
| Player evaluation | Y | Y | Mobile has swipe-through form |
| Evaluation session management | N | Y | Mobile-first |
| Player goals & notes | N | Y | Mobile-first |
| Achievements / badges | Y | Y | |
| Leaderboards | Y | Y | Tab within standings |
| **Engagement** |
| Challenge system | N | Y | Mobile-first, needs web |
| Challenge library | N | Y | Mobile-first |
| Challenge celebration | N | Y | Mobile-first |
| XP / Level system | Y | Y | |
| Season progress | N | Y | Mobile-first |
| **Admin** |
| Registration management | Y | Y | |
| Payment management | Y | Y | |
| Payment reminders | Y | Y | |
| Season management | Y | Partial | Full config on web |
| Season setup wizard | N | Y | Mobile-first |
| Team management | Y | Y | |
| User management | Y | Y | |
| Jersey management | N | Y | Mobile-first |
| Reports & analytics | Y | Y | |
| Admin search | N | Y | Mobile-first |
| Coach directory | Y | Y | |
| Org directory | Y | Y | |
| Season archives | Y | Y | |
| Venue manager | N | Y | Stub/Coming Soon |
| Coach background checks | N | Y | Mobile-first |
| Volunteer assignment | N | Y | Mobile-first |
| Org settings | Y | Y | |
| **Settings** |
| Notification preferences | N | Y | Mobile-only |
| Profile editor | Y | Y | |
| Coach profile | Y | Y | |
| Privacy / Terms / Data | Y | Y | |
| Push notifications | N | Y | Mobile-only by nature |

## Missing on Mobile (exists on Web)

- Full season configuration (mobile has simplified version)
- Advanced reporting / data export
- Form builder (web-only)
- Waiver editor (web-only)
- Payment gateway setup (web-only)

## Missing on Web (exists on Mobile)

- Game Day Command Center (mobile-only courtside tool)
- Live scoring / rally tracking / serve tracker
- Game prep wizard
- Game recap view
- Trading card / roster carousel
- Challenge system + challenge library + celebration
- Hero banner carousel on Team Hub
- Season setup wizard
- Jersey management
- Player goals & notes
- Evaluation session management (swipe-through)
- Season progress
- Admin search
- Coach background checks
- Volunteer assignment
- Push notifications (mobile-only by nature)
- COPPA parental consent flow
- Notification preferences
