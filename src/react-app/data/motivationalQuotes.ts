export interface Quote {
  id: number;
  text: string;
  theme: 
    | "consistency"
    | "starting"
    | "focus"
    | "growth"
    | "patience"
    | "courage"
    | "recovery"
    | "balance"
    | "finishing"
    | "progress";
}

export type MotivationalQuote = Quote;

export const MOTIVATIONAL_QUOTES: Quote[] = [
  // Consistency & Discipline (1-12)
  {
    id: 1,
    text: "Small steps, repeated consistently, create remarkable progress.",
    theme: "consistency",
  },
  {
    id: 2,
    text: "Discipline is choosing what you want most over what you want now.",
    theme: "consistency",
  },
  {
    id: 3,
    text: "Momentum begins the moment you keep the promise you made to yourself.",
    theme: "consistency",
  },
  {
    id: 4,
    text: "Daily routines turn ordinary intentions into extraordinary results.",
    theme: "consistency",
  },
  {
    id: 5,
    text: "You do not need to be extreme, just remarkably consistent.",
    theme: "consistency",
  },
  {
    id: 6,
    text: "The secret of mastery is showing up on the days you least feel like it.",
    theme: "consistency",
  },
  {
    id: 7,
    text: "Excellence is not an event; it is a habit practiced each morning.",
    theme: "consistency",
  },
  {
    id: 8,
    text: "A 1% improvement every day compounds into a transformed life.",
    theme: "consistency",
  },
  {
    id: 9,
    text: "Consistency bridges the wide canyon between ambition and achievement.",
    theme: "consistency",
  },
  {
    id: 10,
    text: "Great works are performed not by sudden strength, but by perseverance.",
    theme: "consistency",
  },
  {
    id: 11,
    text: "Trust the system you built. Honor your daily list, one item at a time.",
    theme: "consistency",
  },
  {
    id: 12,
    text: "Action precedes motivation. Do the first minute, and the rest follows.",
    theme: "consistency",
  },

  // Starting Even When Motivation Is Low (13-24)
  {
    id: 13,
    text: "You don't have to feel ready to begin; you just have to begin.",
    theme: "starting",
  },
  {
    id: 14,
    text: "Start where you are, use what you have, and do what you can.",
    theme: "starting",
  },
  {
    id: 15,
    text: "The hardest part is opening the notebook. Everything softens after that.",
    theme: "starting",
  },
  {
    id: 16,
    text: "Commit to five minutes of honest effort. Friction disappears once moving.",
    theme: "starting",
  },
  {
    id: 17,
    text: "Waiting for perfect mood is the greatest thief of quiet potential.",
    theme: "starting",
  },
  {
    id: 18,
    text: "A rough start is infinitely more valuable than a polished excuse.",
    theme: "starting",
  },
  {
    id: 19,
    text: "Lower the bar for starting until resistance cannot stop you.",
    theme: "starting",
  },
  {
    id: 20,
    text: "You cannot steer a stationary ship. Get in motion, then adjust course.",
    theme: "starting",
  },
  {
    id: 21,
    text: "Action creates clarity. Waiting only creates overthinking.",
    theme: "starting",
  },
  {
    id: 22,
    text: "Today's small beginning is tomorrow's proud foundation.",
    theme: "starting",
  },
  {
    id: 23,
    text: "Do the simple task right in front of you. Energy will meet you halfway.",
    theme: "starting",
  },
  {
    id: 24,
    text: "Courage is taking the first step before the whole staircase is visible.",
    theme: "starting",
  },

  // Focus & Deep Work (25-35)
  {
    id: 25,
    text: "Single-tasking is a modern superpower. Protect your attention fiercely.",
    theme: "focus",
  },
  {
    id: 26,
    text: "Do one thing with full presence rather than five things with half a heart.",
    theme: "focus",
  },
  {
    id: 27,
    text: "Clarity comes from saying no to good distractions so you can say yes to great work.",
    theme: "focus",
  },
  {
    id: 28,
    text: "Quiet the noise. The most meaningful work happens in uninterrupted flow.",
    theme: "focus",
  },
  {
    id: 29,
    text: "Depth is rare. Give your current task the respect of your undivided mind.",
    theme: "focus",
  },
  {
    id: 30,
    text: "Close the extra tabs. Simplicity in your workspace reflects clarity in thought.",
    theme: "focus",
  },
  {
    id: 31,
    text: "Where attention flows, mastery grows.",
    theme: "focus",
  },
  {
    id: 32,
    text: "Resist the urge to check everything. Focus on the one thing that moves the needle.",
    theme: "focus",
  },
  {
    id: 33,
    text: "True productivity is not doing more; it is doing what matters with purpose.",
    theme: "focus",
  },
  {
    id: 34,
    text: "Be present with your work. The quality of your day is the quality of your focus.",
    theme: "focus",
  },
  {
    id: 35,
    text: "A calm mind accomplishes far more than an anxious, rushed one.",
    theme: "focus",
  },

  // Learning & Personal Growth (36-46)
  {
    id: 36,
    text: "Every expert was once a beginner who refused to surrender to frustration.",
    theme: "growth",
  },
  {
    id: 37,
    text: "Mistakes are simply data points guiding you toward better answers.",
    theme: "growth",
  },
  {
    id: 38,
    text: "Embrace the discomfort of the steep learning curve. That is growth happening.",
    theme: "growth",
  },
  {
    id: 39,
    text: "Curiosity transforms challenging tasks into exciting discoveries.",
    theme: "growth",
  },
  {
    id: 40,
    text: "You are not behind; you are learning in your own quiet rhythm.",
    theme: "growth",
  },
  {
    id: 41,
    text: "Knowledge builds quietly like layers of stone, strong and resilient.",
    theme: "growth",
  },
  {
    id: 42,
    text: "Ask better questions today, and tomorrow will bring richer solutions.",
    theme: "growth",
  },
  {
    id: 43,
    text: "The willingness to look inexperienced is the entrance fee to true competence.",
    theme: "growth",
  },
  {
    id: 44,
    text: "Feed your mind with craft, patience, and deliberate practice.",
    theme: "growth",
  },
  {
    id: 45,
    text: "Growth is rarely loud. It happens in the quiet hours of focused curiosity.",
    theme: "growth",
  },
  {
    id: 46,
    text: "Honor how far you have already come while reaching for where you want to go.",
    theme: "growth",
  },

  // Patience & Long-Term Progress (47-57)
  {
    id: 47,
    text: "A redwood does not rush its growth, yet it commands the entire forest.",
    theme: "patience",
  },
  {
    id: 48,
    text: "Most people overestimate what happens in a week and underestimate a year of focus.",
    theme: "patience",
  },
  {
    id: 49,
    text: "Quiet, steady progress will always outperform erratic bursts of speed.",
    theme: "patience",
  },
  {
    id: 50,
    text: "Plant your seeds today. The harvest will arrive on its own time.",
    theme: "patience",
  },
  {
    id: 51,
    text: "Trust the compounding of small, patient efforts over months and years.",
    theme: "patience",
  },
  {
    id: 52,
    text: "Real confidence is being at peace with the time required to build something lasting.",
    theme: "patience",
  },
  {
    id: 53,
    text: "Do not compare your chapter two with someone else's chapter twenty.",
    theme: "patience",
  },
  {
    id: 54,
    text: "Patience is not passive waiting; it is calm dedication while the work matures.",
    theme: "patience",
  },
  {
    id: 55,
    text: "Roots grow deepest in the winter when nothing seems visible above ground.",
    theme: "patience",
  },
  {
    id: 56,
    text: "Give your goals the gift of time. Great craft cannot be microwaved.",
    theme: "patience",
  },
  {
    id: 57,
    text: "The river carves through rock not by force, but by unbroken persistence.",
    theme: "patience",
  },

  // Courage & Self-Belief (58-68)
  {
    id: 58,
    text: "Trust the capability you have developed through your past challenges.",
    theme: "courage",
  },
  {
    id: 59,
    text: "You are stronger than your hesitations and more capable than your doubts.",
    theme: "courage",
  },
  {
    id: 60,
    text: "Doubt is a visitor, not a resident. Acknowledge it, then return to your work.",
    theme: "courage",
  },
  {
    id: 61,
    text: "Have the courage to try what feels difficult. That is where pride is forged.",
    theme: "courage",
  },
  {
    id: 62,
    text: "Speak kindly to yourself; you are listening to your own thoughts all day.",
    theme: "courage",
  },
  {
    id: 63,
    text: "Believe that your contribution matters. Show up with dignity and heart.",
    theme: "courage",
  },
  {
    id: 64,
    text: "Do not shrink from challenges that were sent to reveal your depth.",
    theme: "courage",
  },
  {
    id: 65,
    text: "Confidence is not having all the answers; it is knowing you can find them.",
    theme: "courage",
  },
  {
    id: 66,
    text: "Your potential is defined by what you choose to do next, not what went wrong before.",
    theme: "courage",
  },
  {
    id: 67,
    text: "Dare to be a beginner again whenever a higher summit calls to you.",
    theme: "courage",
  },
  {
    id: 68,
    text: "You hold the pen for today's story. Write a page you feel proud to sign.",
    theme: "courage",
  },

  // Recovering After a Bad Day (69-79)
  {
    id: 69,
    text: "Yesterday ended last night. Today is a completely clean slate.",
    theme: "recovery",
  },
  {
    id: 70,
    text: "A stumble is not a fall unless you refuse to stand up again.",
    theme: "recovery",
  },
  {
    id: 71,
    text: "Forgive yourself for yesterday's delays. Reset, breathe, and begin anew.",
    theme: "recovery",
  },
  {
    id: 72,
    text: "One unproductive afternoon does not undo weeks of sincere discipline.",
    theme: "recovery",
  },
  {
    id: 73,
    text: "Be gentle with your tired moments; resilience includes self-compassion.",
    theme: "recovery",
  },
  {
    id: 74,
    text: "Progress is a jagged line that trends upward over time. Keep climbing.",
    theme: "recovery",
  },
  {
    id: 75,
    text: "The sun resets every single morning without apologizing for yesterday's storm.",
    theme: "recovery",
  },
  {
    id: 76,
    text: "Shake off the weight of what didn't get done. Focus on what you can do right now.",
    theme: "recovery",
  },
  {
    id: 77,
    text: "Every morning arrives with fresh hours ready to be shaped with care.",
    theme: "recovery",
  },
  {
    id: 78,
    text: "When things feel overwhelming, shrink your timeline to the next twenty minutes.",
    theme: "recovery",
  },
  {
    id: 79,
    text: "Grace for past shortcomings is the fuel for future breakthroughs.",
    theme: "recovery",
  },

  // Rest, Balance & Sustainable Productivity (80-89)
  {
    id: 80,
    text: "Rest is not a reward for finished work; it is a prerequisite for good work.",
    theme: "balance",
  },
  {
    id: 81,
    text: "A well-rested mind solves in an hour what an exhausted mind drags through all day.",
    theme: "balance",
  },
  {
    id: 82,
    text: "Sustainability beats intensity. Build a pace you can gladly run for years.",
    theme: "balance",
  },
  {
    id: 83,
    text: "Honor your boundaries. Protecting your energy protects your best creativity.",
    theme: "balance",
  },
  {
    id: 84,
    text: "Step away from the screen when your mind asks for quiet. It always repays you.",
    theme: "balance",
  },
  {
    id: 85,
    text: "True discipline includes knowing when to shut down and replenish.",
    theme: "balance",
  },
  {
    id: 86,
    text: "Life is a marathon made of calm, deliberate sprints and restorative pauses.",
    theme: "balance",
  },
  {
    id: 87,
    text: "Peace of mind is the ultimate metric of a truly successful day.",
    theme: "balance",
  },
  {
    id: 88,
    text: "Give yourself permission to pause. Renewal is an essential part of the journey.",
    theme: "balance",
  },
  {
    id: 89,
    text: "Work wholeheartedly when working; rest deeply when resting.",
    theme: "balance",
  },

  // Finishing What You Start (90-98)
  {
    id: 90,
    text: "Finishing is a skill. Bring your current project across the line before starting new ones.",
    theme: "finishing",
  },
  {
    id: 91,
    text: "Ideas are common; completion is rare and precious. Be a finisher.",
    theme: "finishing",
  },
  {
    id: 92,
    text: "The pride of crossing the finish line outlives the temporary fatigue of the final stretch.",
    theme: "finishing",
  },
  {
    id: 93,
    text: "Close loops. Every completed task frees up mental bandwidth for the next.",
    theme: "finishing",
  },
  {
    id: 94,
    text: "Done is better than perfect, because done can always be refined and shared.",
    theme: "finishing",
  },
  {
    id: 95,
    text: "Give your future self the gift of a clean checklist tonight.",
    theme: "finishing",
  },
  {
    id: 96,
    text: "The last 10% requires focus, but it is where true value is delivered.",
    theme: "finishing",
  },
  {
    id: 97,
    text: "Put the period at the end of the sentence. Ship the work.",
    theme: "finishing",
  },
  {
    id: 98,
    text: "Completion builds self-trust faster than any affirmation ever could.",
    theme: "finishing",
  },

  // Making Progress One Task at a Time (99-105)
  {
    id: 99,
    text: "You don't have to carry the whole mountain; just move this one stone.",
    theme: "progress",
  },
  {
    id: 100,
    text: "One clear task, done with care, turns chaos into quiet order.",
    theme: "progress",
  },
  {
    id: 101,
    text: "Celebrate the small checkmarks; they are the quiet architects of your future.",
    theme: "progress",
  },
  {
    id: 102,
    text: "A focused hour today changes how you will feel when you wake tomorrow.",
    theme: "progress",
  },
  {
    id: 103,
    text: "Do not look at the whole journey today. Simply complete the next honest task.",
    theme: "progress",
  },
  {
    id: 104,
    text: "Progress is made in inches, cherished in moments, and revealed in milestones.",
    theme: "progress",
  },
  {
    id: 105,
    text: "Every task completed is a vote of confidence in the person you are becoming.",
    theme: "progress",
  },
];

/**
 * Returns a deterministic quote for the user's local calendar day.
 * The same day will ALWAYS return the identical quote across re-renders,
 * page reloads, and theme changes.
 */
export function getDailyQuote(date: Date = new Date()): Quote {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Day-of-year calculation
  const startOfYear = new Date(year, 0, 1);
  const diffTime = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Deterministic seed mixing local year, day-of-year, month, and day
  const seed = Math.abs((year * 397 + dayOfYear * 29 + day * 13 + month * 41) % MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[seed] || MOTIVATIONAL_QUOTES[0];
}
