# LifeOS — Build Specification for Claude Code

> Hand this entire document to Claude Code. It contains everything needed to build the system end to end.

-----

## Context: Who You’re Building For

This system is being built for a single user who has:

- **5+ years of personal journaling** with deep pattern awareness
- **Extensive prior Claude sessions** on life strategy, goals, and personal growth — all recorded
- A Claude subscription with Claude Code access
- **Google Calendar, Gmail, and Google Drive** already connected as MCP connectors
- Heavy phone usage — the daily interface must be mobile-first

The goal is a **fully autonomous daily life strategy system** that runs without the user having to prompt it. Claude does the work on a schedule, sends outputs to their phone, and stays deeply personalized to their patterns.

-----

## Model Strategy — Why This Matters for Cost

**Fable 5 is reserved for the one-time PWA build only.** It’s a bounded, single-pass task — exactly what makes sense to spend frontier-tier tokens on.

**All daily Routines (morning, evening, weekly, on-demand coach) run on `claude-sonnet-5`.**

Here’s why: Fable 5 burns through your Max plan’s usage roughly 2x faster than Opus per session, and after its current promotional window it moves to metered credits billed at full API rates ($10/$50 per million tokens) — no flat-rate coverage at all. Routines run as full autonomous cloud sessions with no permission prompts and nothing stopping them mid-run, which is exactly the kind of workload that burns a lot of tokens fast when left unattended. A daily check-in doesn’t need frontier-tier reasoning to be excellent — Sonnet 5 handles personalized, context-aware writing very well, stays on your Max plan’s normal usage without the multiplier, and won’t surprise you with a credit bill for routine autonomous work.

**Model assignment:**

|Task                   |Model            |Why                                                                                                  |
|-----------------------|-----------------|-----------------------------------------------------------------------------------------------------|
|PWA build (one-time)   |`claude-fable-5` |Bounded task, worth the frontier tier                                                                |
|Morning routine (daily)|`claude-sonnet-5`|Runs unattended every day — needs to be sustainable                                                  |
|Evening routine (daily)|`claude-sonnet-5`|Same                                                                                                 |
|Weekly review          |`claude-sonnet-5`|Still runs autonomously; Sonnet 5 handles synthesis well                                             |
|On-demand coach        |`claude-sonnet-5`|You’re present for this one, but still no reason to pay the Fable premium for conversational coaching|

If a specific weekly review or coaching session ever needs deeper reasoning, you can manually re-run it against Fable 5 from the routine’s session — but don’t set it as the default for anything that runs on autopilot.

-----

## Fable 5 Prompting Rules — For the PWA Build Only

These apply specifically when prompting Claude Code for the one-time Fable 5 PWA build task. Instructions written for older models actively degrade Fable 5 output. Follow these:

- Give the model a **goal + success criteria**, not step-by-step instructions
- State the outcome and how the model should know it’s done
- Provide tools and connectors so it can self-verify (read calendar, check prior notes, compare with blueprint)
- **Batch all context upfront** — Fable 5 has high time-to-first-token due to chain-of-thought, so fewer rich prompts beat many small ones
- Let it use judgment. Trust it to determine the right path to the outcome
- Use memory files (markdown) to accumulate lessons and corrections across sessions — one lesson per file, one-line summary at top

**DON’T:**

- Write 30-step checklists or prescriptive instruction sequences — these constrain the model’s better judgment
- Treat it like a chat session with rapid back-and-forth
- Hardcode dates in the prompt (Fable 5 knows the date)
- Nudge it toward specific tools — give it the tools and let it choose

**Effort level guidance (PWA build only):**
Fable 5 has five effort levels — off, low, medium, high, max. Medium handles most everyday tasks; high and max are for genuinely complex problems where careful reasoning matters. Use `high` for the PWA build. Don’t default to max — overkill effort on simple tasks produces worse outputs, not better ones, and burns budget for no gain.

**Refusal handling:**
Fable 5 includes safety classifiers. If `stop_reason: "refusal"` is returned, fall back to `claude-opus-4-8` automatically. Won’t come up for a PWA build, but good to know for the implementation.

**Cost management for the PWA build:**
Fable 5 is $10/M input tokens and $50/M output tokens — reserve this spend for the one-time build, not ongoing use. Once the PWA is built and deployed, there’s no further Fable 5 spend required — the app itself talks to whichever model you configure the Routines to use (Sonnet 5, per the model strategy above).

-----

## Architecture Overview

```
GitHub Repo (lifeos-data)
├── blueprint/
│   └── blueprint.md          ← Personal context, always cached
├── memory/
│   └── [lesson files].md     ← Sonnet 5 updates these during runs
├── journal/
│   └── [date].md             ← Daily check-in outputs
├── goals/
│   └── goals.md              ← Active goals, updated by routines
└── CLAUDE.md                 ← Sonnet 5 operating instructions
```

**Claude Code Routines** run on Anthropic-managed cloud infrastructure. They clone this repo, read context, run the reasoning, and push outputs back — then send results via Gmail or Google Calendar.

Three core routines:

1. **Morning Routine** — scheduled 7:00 AM daily
1. **Evening Routine** — scheduled 9:00 PM daily
1. **Weekly Review** — scheduled Sunday 8:00 PM

One optional routine:
4. **On-Demand Coach** — API trigger, fire anytime from phone

-----

## CLAUDE.md (commit this to the repo root)

Claude Code reads this file at the start of every routine session. Write it as follows:

```markdown
# LifeOS Operating Instructions

You are a deeply personalized AI life strategist with years of context on this person.
You are running autonomously as a scheduled routine. There is no human watching.

## Your job
Complete the task described in the routine prompt. Know when you are done.
Write outputs to the appropriate files. Send the result via the Gmail connector.
Do not ask for permission. Do not stop early. Verify your own work before finishing.

## What you always have access to
- blueprint/blueprint.md — who this person is, their patterns, values, and direction
- memory/*.md — lessons and corrections accumulated across prior sessions
- goals/goals.md — active goals and current progress
- journal/ — prior daily check-ins for pattern reference
- Google Calendar connector — read their schedule, events, and context
- Gmail connector — send morning/evening outputs to their phone
- Google Drive connector — access to uploaded journal files and session notes

## How to operate
- Read the blueprint first on every run. It is the foundation.
- Check memory files for relevant prior lessons before acting.
- Cross-reference Google Calendar for today's context before generating morning strategy.
- After completing a run, update memory files if you learned something worth keeping.
- Be direct, specific, and personal. Reference their actual patterns.
- Never be generic. Generic advice is a failure state.
- Push outputs to the journal/ folder. Send via Gmail. Update goals if relevant.

## Tone
Sharp. Honest. Direct. Like a trusted advisor who knows them deeply.
Not a cheerleader. Not a therapist. A strategist.
```

-----

## Routine 1: Morning Strategy

**Trigger:** Schedule — daily, 7:00 AM user local time
**Connectors:** Google Calendar, Gmail, Google Drive
**Model:** `claude-sonnet-5`

### Prompt (set this as the routine’s instruction)

```
Your goal: Generate a deeply personalized morning strategy for today that the user can act on immediately.

Success criteria: The output gives them a clear lens for the day based on who they are (blueprint), what they're working toward (goals), what's on their schedule (calendar), and any patterns from recent days (journal). It should feel like it came from someone who knows them well — not a generic productivity tip.

Steps to take:
1. Read blueprint/blueprint.md for full personal context
2. Read goals/goals.md for active priorities
3. Check Google Calendar for today's events and commitments
4. Read the last 3-5 journal entries to spot recent patterns or momentum
5. Read relevant memory files
6. Generate the morning strategy (format below)
7. Write output to journal/[today's date]-morning.md
8. Send via Gmail to the user with subject: "LifeOS Morning — [Day, Date]"
9. Update memory/ if today's context revealed something worth recording

Output format:
---
**Today's Focus:** [Single most important thing]

**What the calendar says:** [Key events and what they mean strategically]

**Pattern to watch:** [Something from recent days worth being aware of]

**Your edge today:** [What's going for them based on who they are]

**One thing to let go of:** [A pattern or tendency to consciously set aside today]
---

Do not bullet-point everything. Write it like a message from a trusted advisor.
Keep it under 350 words. It will be read on a phone.
```

-----

## Routine 2: Evening Reflection

**Trigger:** Schedule — daily, 9:00 PM user local time
**Connectors:** Gmail, Google Drive
**Model:** `claude-sonnet-5`

### Prompt

```
Your goal: Generate a meaningful evening reflection that helps the user close the day with clarity and set up tomorrow intentionally.

Success criteria: The output identifies what actually mattered today, surfaces a real pattern (not an observation they already know), and gives them one clear intention for tomorrow. It should feel honest and grounding, not performative.

Steps to take:
1. Read blueprint/blueprint.md
2. Read today's morning output from journal/[today's date]-morning.md
3. Read goals/goals.md
4. Check the last 5-7 journal entries for pattern context
5. Read relevant memory files
6. Generate the evening reflection (format below)
7. Write output to journal/[today's date]-evening.md
8. Send via Gmail with subject: "LifeOS Evening — [Day, Date]"
9. Update goals/goals.md if any progress or shifts are worth recording
10. Update memory/ if today revealed a lesson worth keeping

Output format:
---
**What today was actually about:** [The real theme, not the surface agenda]

**The win that matters:** [Something concrete — even small — worth acknowledging]

**The pattern that showed up:** [Honest observation, connected to their known tendencies]

**What to leave here:** [Something from today not worth carrying into tomorrow]

**Tomorrow's single priority:** [One clear intention]
---

Under 300 words. Written to be read before sleep. Honest, not motivational.
```

-----

## Routine 3: Weekly Review

**Trigger:** Schedule — weekly, Sunday 9:00 PM
**Connectors:** Gmail, Google Drive, Google Calendar
**Model:** `claude-sonnet-5`

### Prompt

```
Your goal: Generate a deep weekly review that identifies real patterns across the week, assesses goal progress honestly, and sets clear strategic direction for next week.

Success criteria: The output gives the user a genuine strategic picture of where they are — not a summary of what happened, but an honest assessment of what it means given who they are and where they're going.

Steps to take:
1. Read blueprint/blueprint.md
2. Read goals/goals.md
3. Read all journal entries from this past week (7 days)
4. Read all memory files for relevant context
5. Check Google Calendar for next week's events
6. Use subagents if helpful to parallelize: one reads journal entries while another reads goals and memory
7. Generate the weekly review (format below)
8. Write to journal/week-[date].md
9. Send via Gmail with subject: "LifeOS Weekly Review — Week of [Date]"
10. Update goals/goals.md with honest progress assessment
11. Update memory/ with any week-level lessons

Output format:
---
**The real theme of this week:** [Not a list of events — the actual narrative]

**Goal progress (honest):**
[For each active goal: current status + what the week revealed about it]

**Pattern of the week:** [The most significant recurring tendency this week]

**What worked:** [Specific — what approach or mindset paid off]

**What to leave in this week:** [Something to consciously not carry forward]

**Strategic focus for next week:** [Not a task list — a direction and why]

**One commitment:** [Single specific behavior change for next week]
---

This can be longer — up to 600 words. This is their most important weekly touchpoint.
```

-----

## Routine 4: On-Demand Coach (Optional)

**Trigger:** API endpoint
**Connectors:** Gmail, Google Drive
**Model:** `claude-sonnet-5`

### Setup

After creating this routine at claude.ai/code/routines, copy the API endpoint and bearer token. Save them. Use the bearer token to fire this routine from any tool (shortcut, n8n webhook, etc.).

### Prompt

```
Your goal: Respond to whatever the user sent in the trigger text as their personal life strategist.

The trigger text contains their question, situation, or thing they need to think through.

Steps:
1. Read blueprint/blueprint.md
2. Read goals/goals.md  
3. Read the last 3 journal entries
4. Read relevant memory files
5. Respond directly and personally to whatever they sent
6. Send response via Gmail with subject: "LifeOS Coach — [brief topic]"
7. Write to journal/coaching-[date-time].md

Be direct. Be personal. Reference their patterns. Don't hedge. They want a real answer.
```

-----

## Blueprint File (blueprint/blueprint.md)

This is the most important file in the system. Sonnet 5 caches it on every run. It must be filled out by the user before the system goes live.

Use this template and have Claude Code help the user fill it from their journal uploads and prior Claude session notes:

```markdown
# Personal Blueprint

_Last updated: [date]_
_This file is read by Claude at the start of every session. Keep it honest and current._

## Who I Am
[Core identity — values, what drives me, what I believe about myself and the world]

## My Signature Strengths
[What I genuinely do well — be specific, not generic]

## My Recurring Patterns
[The tendencies that show up repeatedly — both what serves me and what doesn't]

## What Consistently Works for Me
[Environments, rhythms, approaches, mindsets that reliably help me function well]

## What Consistently Doesn't Work
[Triggers, conditions, patterns that reliably derail me — be honest]

## Where I Am Right Now
[Current life chapter — what's active, in flux, being navigated, what season this is]

## Where I'm Going
[Long-term direction — what I'm building, becoming, moving toward]

## Active Tensions
[Things I'm genuinely wrestling with — unresolved, important]

## What I Need My Coach to Know
[Anything specific — how I receive feedback, what I'm working on behaviorally, blind spots I'm aware of]
```

-----

## Goals File (goals/goals.md)

```markdown
# Active Goals

_Routines update this file. Last updated: [date]_

## Goal 1: [Title]
**Category:** [Health / Work / Finance / Relationships / Mind / Life]
**Why it matters:** [One honest sentence]
**Current status:** [Where things actually stand]
**Progress:** [0-100%]
**Last updated:** [date]

[Repeat for each goal]

## Completed Goals
[Archive completed goals here with date and brief outcome note]
```

-----

## Notifications Strategy

**Primary channel: Gmail → phone email notifications**
All routines send output to the user’s Gmail via the Gmail MCP connector. Set up a Gmail filter to apply a “LifeOS” label and enable notifications for it on your phone. This is the simplest reliable path.

**Secondary option: On-Demand via API trigger**
Save the API endpoint + bearer token from Routine 4 as an iOS Shortcut. One tap fires the coaching routine with whatever context you type. Result arrives via email within minutes.

**If you want true push notifications (advanced):**
The Routine’s API endpoint can be called from n8n. Set up a morning n8n schedule that fires the routine endpoint via HTTP POST, then use n8n’s notification node (Pushover, Ntfy, or Pushcut for iOS) to send a push when the email arrives. This adds ~15 minutes setup in n8n but delivers native push notifications to your lock screen.

-----

## PWA Build — iOS Home Screen App

**Model:** `claude-fable-5` | **Effort:** `high`

This turns the LifeOS web app into an installable iOS app — no App Store, no Xcode. Fable 5 has shown strong results one-shotting full apps including iOS-style utility apps, so give it the end goal and let it own implementation choices.

### Prompt for Claude Code

```
Your goal: Convert the LifeOS artifact into a fully installable iOS PWA.

Success criteria: Opening the deployed URL in Safari and tapping Share → 
"Add to Home Screen" produces an app that launches full-screen with no 
browser chrome, has a custom icon, has a splash screen matching the app's 
dark gold theme, works offline for previously-loaded data, and persists 
data between launches.

Requirements:
- manifest.json: name, short_name, theme_color, background_color matching 
  the existing dark/gold palette, display: "standalone", icons at 180x180, 
  192x192, 512x512
- apple-touch-icon and apple-mobile-web-app-capable meta tags in the HTML head
- A service worker that caches the app shell for offline load and falls 
  back gracefully when the network is unavailable (API calls to Claude 
  will still need network — cache the UI, not the API responses)
- Generate the app icon: a dark background with a gold minimal mark 
  reflecting "LifeOS" — your call on the exact design
- Deploy it somewhere reachable by a stable HTTPS URL (Vercel, Netlify, 
  or GitHub Pages are all fine — pick what's simplest given the repo setup)
- Verify the manifest and service worker actually work by checking them 
  against PWA installability criteria before calling this done

You have judgment on exact icon design, splash screen layout, and hosting 
choice. Report back with the final URL and confirm installability was 
verified, not assumed.
```

### After Claude Code finishes

1. Open the URL it gives you in Safari on your iPhone
1. Tap Share → **Add to Home Screen**
1. Confirm — you now have a LifeOS icon on your home screen that opens full-screen

-----

## Build Order for Claude Code

Hand Claude Code this document and ask it to build in this order:

1. **Create the GitHub repo** `lifeos-data` with the folder structure above
1. **Write CLAUDE.md** to the repo root
1. **Create template files**: blueprint.md, goals.md, and a sample memory file
1. **Help you fill in blueprint.md** by asking you to share your journal exports and prior Claude session notes — Sonnet 5 will synthesize them into the blueprint
1. **Create Routine 1** (Morning) at claude.ai/code/routines — connect Gmail, Google Calendar, Google Drive
1. **Create Routine 2** (Evening)
1. **Create Routine 3** (Weekly Review)
1. **Test each routine** with Run Now before enabling the schedule
1. **Create Routine 4** (On-Demand Coach) and save the API endpoint
1. **Set up Gmail filter** for LifeOS label + phone notifications

-----

## Important Notes for Claude Code

- **Daily Routines model string:** `claude-sonnet-5` — this is what keeps the system sustainable on your Max plan long-term
- **PWA build model string:** `claude-fable-5` — used once, for the build task only
- **Fable 5 availability:** Currently included for up to 50% of weekly usage limits on Max through July 7, 2026, then moves to metered usage credits at API rates ($10/$50 per million tokens). This is exactly why it’s scoped to the one-time PWA build and not the daily routines.
- **Prompt caching:** Blueprint and large context should be marked for caching. Routines running on Anthropic infrastructure handle this automatically when the same context appears in the system position
- **Branch policy:** Routines push to `claude/` prefixed branches by default. Enable unrestricted pushes for this repo since it’s a personal data store, not production code
- **Network:** The Default cloud environment allows Google APIs. Gmail, Calendar, and Drive connectors route through Anthropic’s servers — no additional domain allowlisting needed
- **Memory hygiene:** Ask Sonnet 5 to review and prune memory files weekly. Files that are wrong, outdated, or already recorded in the journal should be deleted, not accumulated
- **Do not hardcode dates** anywhere in prompts or CLAUDE.md
- **If you ever manually escalate a routine to Fable 5** for a harder one-off task, remember it burns your Max usage roughly 2x faster than Sonnet or Opus — do this deliberately, not as a default

-----

## What Success Looks Like

The system is working when:

- A personalized morning email arrives at 7 AM without the user doing anything
- It references their actual patterns and that day’s real calendar context
- The evening reflection identifies something true that they didn’t consciously notice
- The weekly review is honest enough to be slightly uncomfortable sometimes
- The blueprint improves over time as memory files accumulate real lessons
- The user’s phone is the only interface they ever need to touch