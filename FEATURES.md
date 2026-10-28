# Features

Running tracker: what's built (as UI shell — fake data, no backend) vs. what
still needs to be dictated and built. Update this whenever a feature moves
between the two lists. Each page gets its own section as pages get added.

## Performance Review page

### Built (UI shell only — no real functionality behind it)
- [x] App header (global orientation bar)
- [x] 3-column layout: Navigation / Hero / Detail
- [x] Navigation: search bar (client-side filter over fake list)
- [x] Navigation: scrollable video list, activity-type icon (success/
      follow-up/training), date + title rows
- [x] Hero: title, static media placeholder, bookmark rail (Main text /
      Transcript / Notes / Core Lessons)
- [x] Hero: Main text (read-only fake text)
- [x] Hero: Transcript (fake lines, click is a no-op — no real video to seek)
- [x] Hero: Notes (locally editable, not persisted)
- [x] Hero: Core Lessons (locally editable, not persisted)
- [x] Detail: draggable bookmark rail, reorderable, splits into two
      independent text panes when a bookmark crosses the line

### To build (real functionality — not started)
- [ ] Real video/audio upload + storage
- [ ] Real media playback (currently a static placeholder)
- [ ] Real transcription generation
- [ ] Transcript lines actually seeking the video
- [ ] AI analysis of the call/session (currently no content type for this at
      all — needs its own bookmark + content type)
- [ ] AI-assisted core lesson extraction (currently just a free-text field)
- [ ] Marking a session successful/failed (currently just a fixed fake tag
      used to pick the Navigation icon)
- [ ] Notes/Core Lessons persistence (currently local component state, lost
      on refresh)
- [ ] Backend data model + storage for videos/notes/lessons/transcripts
- [ ] Auth (not started — no users yet)
