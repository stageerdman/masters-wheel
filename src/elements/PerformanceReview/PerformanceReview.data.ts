// Fake fixture data — no backend yet. Delete this file once real data
// arrives rather than growing it. See FEATURES.md.

export type ActivityType = "success" | "followup" | "training";

export type TranscriptLine = {
  time: string;
  text: string;
};

export type VideoRecord = {
  id: string;
  activityType: ActivityType;
  date: string;
  title: string;
  mainText: string;
  transcript: TranscriptLine[];
  notes: string;
  lessons: string;
};

export const FAKE_VIDEOS: VideoRecord[] = [
  {
    id: "1",
    activityType: "success",
    date: "2026-10-02",
    title: "John Frank (20k)",
    mainText:
      "Closed the renewal plus an upsell to the pro tier. Client cited fast response times as the deciding factor.",
    transcript: [
      { time: "00:00", text: "Thanks for taking the call, John." },
      { time: "00:14", text: "Let's walk through the renewal numbers." },
      { time: "01:02", text: "Pro tier would cover the extra seats you mentioned." },
      { time: "02:30", text: "Great, let's get the paperwork moving." },
    ],
    notes: "Follow up with onboarding team re: extra seats by Friday.",
    lessons: "Leading with response-time metrics landed well — reuse in next pitch.",
  },
  {
    id: "2",
    activityType: "followup",
    date: "2026-09-28",
    title: "Maria Santos",
    mainText:
      "Budget approval pending on their end. Needs a revised quote excluding the analytics add-on.",
    transcript: [
      { time: "00:00", text: "Hi Maria, thanks for the update." },
      { time: "00:40", text: "Understood — let's trim the analytics add-on for now." },
      { time: "01:55", text: "I'll send the revised quote today." },
    ],
    notes: "Send revised quote without analytics add-on. Check back in 1 week.",
    lessons: "",
  },
  {
    id: "3",
    activityType: "training",
    date: "2026-09-20",
    title: "Objection handling — module 4",
    mainText:
      "Practice session on price objections. Reviewed with team lead afterward.",
    transcript: [
      { time: "00:00", text: "Let's role-play a price objection." },
      { time: "00:22", text: "I said the price is too high for our budget." },
      { time: "00:35", text: "Try anchoring back to ROI before discounting." },
    ],
    notes: "Need more reps on anchoring before discounting.",
    lessons: "Anchor to ROI before offering any discount — don't lead with price.",
  },
  {
    id: "4",
    activityType: "success",
    date: "2026-09-15",
    title: "Dave Chen (8k)",
    mainText: "Quick turnaround renewal, no major objections.",
    transcript: [
      { time: "00:00", text: "Hey Dave, same terms as last year works?" },
      { time: "00:18", text: "Yep, sounds good, let's sign." },
    ],
    notes: "",
    lessons: "",
  },
  {
    id: "5",
    activityType: "followup",
    date: "2026-09-10",
    title: "Priya Patel",
    mainText: "Needs sign-off from her director before moving forward.",
    transcript: [
      { time: "00:00", text: "Priya, what's the timeline on director sign-off?" },
      { time: "00:33", text: "Should have an answer by next week." },
    ],
    notes: "Check in next Monday if no word.",
    lessons: "",
  },
  {
    id: "6",
    activityType: "training",
    date: "2026-09-01",
    title: "Cold open practice — module 1",
    mainText: "First pass at the new cold-open script.",
    transcript: [
      { time: "00:00", text: "Hi, this is Alex calling from..." },
      { time: "00:09", text: "Try a shorter opener, get to value faster." },
    ],
    notes: "Script felt long — cut the first two lines.",
    lessons: "Shorter cold opens hold attention better in the first 10 seconds.",
  },
];
