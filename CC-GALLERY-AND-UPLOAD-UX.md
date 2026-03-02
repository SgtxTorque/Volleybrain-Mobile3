# Team Hub — Gallery Feature + Photo Upload UX

## RULES STILL APPLY
Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## PART 1: PHOTO/VIDEO GALLERY

### Gallery Button (already exists in hero header)
The "📷 Gallery" button in the team hub hero header should navigate to a full gallery screen for that team.

### Gallery Screen Layout

**Header:**
- Back arrow + "Gallery" title + team name subtitle
- Filter tabs: "All" | "Photos" | "Videos" (horizontal pills)
- Sort: Most Recent first (default)

**Grid View:**
- 3-column photo grid (like Instagram / phone gallery)
- Square thumbnails, minimal gap between them (2px)
- Videos show a small play icon overlay in the corner + duration badge
- Infinite scroll / pagination — load 30 at a time, fetch more on scroll
- Pull to refresh

**Data Source:**
- Query ALL media from team wall posts for the selected team
- Check SCHEMA_REFERENCE.csv for where post media/attachments are stored (likely a media URL field on `team_posts`, or a separate `post_attachments` / `team_post_media` table)
- Include: photos from photo posts, photos from shoutout posts, any attached media
- Sort by post creation date, newest first

### Full-Screen Photo Viewer (tap a photo in the gallery)

When a user taps a photo in the grid, open a full-screen viewer:

**Layout:**
- Full-screen dark background
- Photo centered, zoomable (pinch to zoom, double-tap to zoom)
- Swipe left/right to navigate between photos in the gallery

**Top Bar (over the photo, semi-transparent dark overlay):**
- Back/close button (X) — top left
- Three-dot menu (⋯) — top right

**Info Panel (bottom overlay, semi-transparent dark):**
- Posted by: author avatar + author name
- Date posted: "Feb 16, 2026" or "3 days ago"
- Post caption/text if the original post had text
- Team name
- Reaction count if the original post had reactions: "❤️ 3 🔥 2"

**Three-dot menu options:**
- **Save to Device** — downloads the photo to the user's phone camera roll / gallery. Use `MediaLibrary.saveToLibraryAsync()` from expo-media-library (check if already installed in package.json).
- **Share** — opens native share sheet with the photo
- **View Original Post** — navigates back to the team wall and scrolls to the original post
- For Coaches/Admins only: **Delete Photo** — removes the media (with confirmation dialog)

**Save/Download button (prominent):**
- Also add a download icon button in the top bar (next to the three-dot menu) for quick access — users shouldn't have to open the menu to save. Tap downloads immediately.

### Video Viewer
- Same full-screen viewer but with video controls (play/pause, scrub bar, mute/unmute)
- Same info panel and menu options
- Save to device saves the video file

### Gallery Empty State
- If no photos/videos exist for the team: show a centered illustration with "No photos yet. Post to the team wall to start building your gallery!" and a "Post Now" button that navigates to the post composer.

---

## PART 2: SAVE/DOWNLOAD FROM POSTS (Team Wall)

Users should also be able to save photos directly from posts in the team wall feed, without going to the gallery.

**On post photos in the feed:**
- Long-press on a photo in a post → shows a context menu:
  - "Save Photo" — saves to device
  - "Share Photo" — native share sheet
  - "View Full Screen" — opens the full-screen viewer from Part 1
- Alternatively, add a small download icon in the corner of post photos (subtle, semi-transparent)

---

## PART 3: PHOTO UPLOAD UX OVERHAUL

### Current Problems:
1. When uploading a photo, it immediately goes to a crop screen — users expect to just upload and go
2. The "CROP" text in the top-right is confusing as the accept/confirm button
3. The crop grid handles are too close to screen edges on some devices, hard to manipulate
4. Edit tools (rotate, aspect ratio) are in the top-right corner instead of at the bottom where thumbs can reach them

### New Upload Flow:

**Step 1: Pick Photo**
- User taps camera icon (on post composer, cover photo, etc.)
- System image picker opens (or camera)
- User selects photo → returns to the app

**Step 2: Preview + Accept (NEW — this is the key change)**
- Show the selected photo in a preview screen
- Large preview of the photo centered on screen
- **Bottom toolbar with options:**
  - ✂️ "Crop" button — OPTIONAL, only if the user wants to crop. Tapping opens the crop tool.
  - 🔄 "Rotate" button — rotate 90 degrees per tap
  - ✅ "Use Photo" or checkmark button — large, prominent, primary action. THIS is how you accept. Not "CROP".
- The "Use Photo" / checkmark button should be the most prominent element — large, colored (teal/primary), impossible to miss
- If the user doesn't want to crop or rotate, they just tap "Use Photo" and move on immediately

**Step 3: Crop Tool (only if user taps Crop)**
- Opens the crop interface
- Crop handles with generous touch targets (not too close to edges — add 20px inset padding from screen edges)
- Aspect ratio options at the bottom: Free | Square | 4:3 | 16:9
- Rotate button at the bottom
- "Done" / checkmark button to confirm crop — bottom right, large and clear
- "Cancel" to go back to the preview without cropping
- ALL controls at the BOTTOM of the screen, not top-right. Users hold phones with thumbs at the bottom.

### Implementation:
- Check what image picker / crop library is currently being used (likely `expo-image-picker` or `expo-image-manipulator` or a crop library like `react-native-image-crop-picker`)
- If using `expo-image-picker`, it has a built-in `allowsEditing` option that forces the system crop UI. Set `allowsEditing: false` to skip the system crop. Then build the custom preview screen with optional crop.
- If using a third-party crop library, configure it to NOT auto-open. Only open when the user explicitly taps "Crop".
- This change should apply EVERYWHERE photos are uploaded in the app:
  - Post composer photo upload
  - Cover photo upload (team hub hero)
  - Profile photo upload
  - Banner photo upload (admin org)

---

## PERMISSIONS CHECK
- Saving photos to device requires `MediaLibrary` permission on Android/iOS
- Check if `expo-media-library` is installed. If not, install it.
- Request permission before first save attempt, with a clear explanation: "VolleyBrain would like to save photos to your device"

---

## VERIFICATION CHECKLIST
- [ ] Gallery button in hero header navigates to gallery screen
- [ ] Gallery shows 3-column grid of all team media
- [ ] Filter tabs work: All, Photos, Videos
- [ ] Tap photo opens full-screen viewer with zoom and swipe
- [ ] Info panel shows: who posted, when, caption, team, reactions
- [ ] Save to device works from full-screen viewer
- [ ] Share works from full-screen viewer
- [ ] Download icon in top bar for quick save
- [ ] Three-dot menu has all options (Save, Share, View Post, Delete for admin/coach)
- [ ] Long-press on feed photos shows save/share context menu
- [ ] Empty gallery state shows message + "Post Now" button
- [ ] Photo upload: preview screen shown first, NOT crop screen
- [ ] "Use Photo" is the prominent accept button at bottom
- [ ] Crop is optional — only opens when user taps "Crop"
- [ ] All edit tools (crop, rotate) at bottom of screen, not top-right
- [ ] Crop handles have generous touch targets with edge padding
- [ ] Upload flow change applies to: post photos, cover photos, profile photos, banner photos
- [ ] Works for all roles
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then build it.
