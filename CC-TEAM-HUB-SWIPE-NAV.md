# Team Hub — Replace Team Selector with Swipe Navigation

## RULES STILL APPLY
Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## THE CONCEPT

Remove the team selector pills from the Team Hub entirely. Replace with a full-page swipe navigation — each team is a complete "page" that you swipe between horizontally, like swiping through photos in a gallery.

When the user swipes left or right ANYWHERE on the screen, the entire team hub page slides away and the next team's page slides in. Same animation as swiping through photos — the current page moves off-screen and the next page pulls over from the side.

---

## IMPLEMENTATION

### Remove Team Selector Pills
- Delete the team selector pill row from the Team Hub screen
- The pills still exist on Home screens for parent/coach — do NOT remove them from there. Only remove from the Team Hub.

### Swipe Page Navigation
- Use a horizontal `FlatList` or `ScrollView` with `pagingEnabled={true}` and `horizontal={true}` — or better, use a library like `react-native-pager-view` (PagerView) which gives native-feeling page swipe animations.
- Check if `react-native-pager-view` is already in package.json. If not, check if `react-native-tab-view` is available (it uses PagerView under the hood). If neither exists, a horizontal FlatList with `pagingEnabled` and `snapToInterval` set to screen width works fine.
- Each "page" is a complete Team Hub for one team — hero photo, team name, tabs (Feed/Roster/Schedule/Achievements), post composer, and feed content.
- The number of pages = the number of teams the user has access to (for coaches: their assigned teams, for parents: their children's teams, for admins: all teams).
- Swiping left → next team. Swiping right → previous team.
- The swipe should feel exactly like swiping through photos — smooth, with the current page sliding off and the next sliding in. NOT a scroll — a PAGE SNAP.

### Carousel Indicator Dots
- Small dots positioned ABOVE the hero header photo and BELOW the VolleyBrain app header bar
- One dot per team
- Active dot is filled/larger, inactive dots are smaller/faded
- The dots update as you swipe between teams
- If only 1 team, no dots shown (no need to indicate swiping when there's only one page)
- If 5+ teams, consider showing only the nearby dots with a fade effect (like Instagram stories dots)

### Mini Header on Scroll
- The compact mini header that appears when scrolling past the hero photo still works the same way
- It shows the CURRENT team's cover photo thumbnail + team name
- When the user swipes to a different team, the mini header updates to reflect the new team

### Page Content Independence
- Each team page maintains its own scroll position independently
- If you scroll down in Team A's feed, swipe to Team B, then swipe back to Team A — Team A should still be scrolled to where you left it
- Each page fetches its own data (posts, roster, schedule) based on its team ID
- Consider lazy loading: only fetch data for the visible page + one page on each side (for smooth pre-loading during swipes)

### Animation Details
- The swipe animation should be a direct 1:1 drag — as the user's finger moves, the page moves with it. Not a triggered animation, but a gesture-driven transition.
- When the user releases, snap to the nearest page (spring animation)
- Swipe velocity matters — a fast flick should advance to the next page even if the finger only moved a small distance
- The transition should feel like iOS Photos app swiping between images

### Which Roles Get This
- **Coach Team Hub:** swipe between coached teams
- **Parent Team Hub:** swipe between children's teams
- **Admin Teams Tab drill-down:** when admin taps into a team from the Teams list, they see that single team's hub. Swiping is optional here — admin could swipe through all teams, or just see the one they tapped into. For now, enable swiping for admin too so they can browse teams without going back to the list.
- **Player Team Hub:** if a player is on multiple teams, swipe between them. If only one team, no swiping.

### Edge Cases
- **One team only:** No dots shown, swiping disabled. Just a normal single-page team hub.
- **Team data loading:** Show a skeleton/loading state for the team page while data loads. Don't show a blank page during swipe.
- **Vertical scroll vs horizontal swipe conflict:** The team hub has vertical scrolling (feed). The horizontal swipe should be detected by the PagerView at the top level, and vertical scrolls inside each page should not interfere. `react-native-pager-view` handles this natively. If using a FlatList, you may need `nestedScrollEnabled` and careful gesture handling.

---

## WHAT STAYS THE SAME
- Hero cover photo (full-width, edge-to-edge)
- Team name + player/coach count below hero
- Gallery and Stats buttons on the hero
- Camera icon for cover photo upload (coach/admin only)
- Tab bar (Feed/Roster/Schedule/Achievements)
- Post composer ("What's on your mind?")
- Post cards with Like/Comment/Share
- Sticky mini header on scroll
- All role-based permissions on actions

## WHAT CHANGES
- Team selector pills → REMOVED from Team Hub
- Navigation between teams → horizontal page swipe
- Carousel dots added above hero, below app header
- Each team is a full independent page

---

## VERIFICATION CHECKLIST
- [ ] Team selector pills removed from Team Hub
- [ ] Swiping left/right transitions between team pages
- [ ] Swipe animation feels like photo gallery (1:1 gesture drag, snap to page)
- [ ] Carousel indicator dots show above hero, below app header
- [ ] Active dot updates on swipe
- [ ] Mini header updates to show current team on swipe
- [ ] Each team page has independent scroll position
- [ ] Data loads correctly for each team (posts, roster, etc.)
- [ ] Single-team users see no dots, no swipe
- [ ] Vertical scrolling inside feed doesn't conflict with horizontal swipe
- [ ] Works for Coach, Parent, Admin, and Player roles
- [ ] Home screen team selectors UNCHANGED (pills still work there)
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then build it.
