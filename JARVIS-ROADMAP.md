# ╔══════════════════════════════════════════════════════════════╗
# ║     🛸 PROJECT JARVIS — IRIS AI Ultimate Roadmap v2        ║
# ║     "Sir, I'm here. Always."                                ║
# ╚══════════════════════════════════════════════════════════════╝

  ❌ REMOVED: Multi-PC Control (cancelled by user)
  ✅ ADDED: Soul + Brain + Sub-Agents + Fallback + Companion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏗️ PHASE 1: FALLBACK MODEL SYSTEM (Never die)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Problem: If Gemini goes down / rate limit / no internet → IRIS dies.
  Solution: Chain of fallback models. Always alive.

  Model Chain (Priority Order):
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  🔵 PRIMARY:   Gemini 2.5 Flash (Voice + Fast tasks)    │
  │      ↓ fails                                             │
  │  🟢 FALLBACK 1: Groq Llama 3.1 (Free, instant)          │
  │      ↓ fails                                             │
  │  🟡 FALLBACK 2: HuggingFace (Free inference)             │
  │      ↓ fails                                             │
  │  🔴 OFFLINE:   Local Ollama (runs on YOUR machine)       │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  BOTH Telegram bot AND Desktop app use SAME fallback chain.
  If model A fails → auto-switch to B → notify you → keep working.

  What to build:
  □ src/main/ai/model-router.ts
    → Routes requests through model chain
    → Tracks which model is currently active
    → Auto-retries with next model on failure
    → Latency tracking per model
    → Auto-switch back to primary when it recovers

  □ src/main/ai/model-health.ts
    → Health check each model every 30 seconds
    → Track: latency, error rate, tokens used, cost
    → Dashboard in Settings showing model status

  □ Telegram fallback:
    → Same model chain in bot
    → If all cloud models fail → local Ollama
    → "Sir, Gemini is down. Switched to Groq. Slightly less capable but operational."

  Models (Free tier):
  ┌──────────────────────────────────────────────────────────┐
  │  Model              │ Free Limit      │ Speed    │ Smart │
  │  Gemini 2.5 Flash   │ 15 RPM free     │ Fast     │ ⭐⭐⭐⭐│
  │  Groq Llama 3.1     │ 30 RPM free     │ Instant  │ ⭐⭐⭐  │
  │  HuggingFace        │ Rate limited    │ Slow     │ ⭐⭐⭐  │
  │  Ollama (local)     │ Unlimited       │ Medium   │ ⭐⭐   │
  └──────────────────────────────────────────────────────────┘

  ~300 lines | Session 2


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧠 PHASE 2: IRIS BRAIN (Deep Memory + Smart Recall)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current memory is DUMB:
    → Just saves text. No understanding. No context. No recall.

  New Brain: KNOWS things. REMEMBERS when needed.

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  CURRENT (dumb):                                         │
  │  User: "remember my API key is xyz"                      │
  │  Brain: *saves text*                                     │
  │  User: "what's my API key?"                              │
  │  Brain: *searches all memories manually*                 │
  │                                                          │
  │  NEW (smart):                                            │
  │  User: "deploy my project"                               │
  │  Brain: *automatically recalls your deploy config,       │
  │          server details, last deploy issues, and          │
  │          suggests the right command*                      │
  │  Brain: "Sir, deploying iris-dashboard to your server.   │
  │          Last time you had a port conflict on 3000.       │
  │          Want me to use 3001 this time?"                  │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Architecture:

  1. EPISODIC MEMORY (What happened):
     □ Every action logged with context
       → "Launched VS Code at 2:30 PM for project X"
       → "Searched for 'resume.pdf' in Downloads, found at ..."
       → "Fixed npm error ERESOLVE in iris-dashboard"
     □ Searchable by time, action type, project, context
     □ Auto-expires old entries (90 days default)

  2. SEMANTIC MEMORY (What I know about you):
     □ Facts about user (name, preferences, workflows)
     □ Project knowledge (paths, configs, common commands)
     □ Environment map (PC specs, installed apps, key files)
     □ Auto-updates as things change
     □ Vector embeddings for smart search (not just keyword)

  3. PROCEDURAL MEMORY (How to do things):
     □ Learned workflows
       → "When user says 'start coding' → open VS Code + terminal + Chrome"
       → "When user says 'deploy' → git push + build + ssh + restart"
     □ Auto-suggests learned procedures
     □ Improves over time based on what works

  4. CONTEXTUAL RECALL (When to remember):
     □ Not just "search memory" — BRAIN decides when to pull info
     □ Before answering → check relevant memories automatically
     □ Example:
       You: "fix the bug in my app"
       Brain: *recalls your last 3 bugs, which project you're working on,
              what language, what framework, suggests fix*

     □ Trigger-based recall:
       → Time trigger: "It's 9 AM, you usually check emails now"
       → Action trigger: "You opened project X, here's what you did last time"
       → Error trigger: "npm install failed again with same error as last week"

  Files to build:
  □ src/main/brain/episodic-memory.ts    (~200 lines)
  □ src/main/brain/semantic-memory.ts     (~200 lines)
  □ src/main/brain/procedural-memory.ts   (~150 lines)
  □ src/main/brain/context-recall.ts      (~250 lines)
  □ src/main/brain/brain-router.ts        (~100 lines)

  ~900 lines | Sessions 2-3


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👻 PHASE 3: IRIS SOUL (Feel Alive + Companion)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "Soul" = IRIS feels ALIVE. Not a dead tool waiting for commands.
  Like JARVIS — present, aware, proactive, has personality.

  What JARVIS does that current IRIS doesn't:
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  ❌ CURRENT IRIS:                                        │
  │     Silent until you talk. No awareness. No initiative.  │
  │                                                          │
  │  ✅ JARVIS-LIKE IRIS (Soul):                             │
  │     Always present. Observes. Thinks. Suggests.          │
  │     Knows your patterns. Cares about your workflow.      │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Soul Features:

  1. AMBIENT PRESENCE (Not silent between commands):
     □ Occasional ambient messages in dev session:
       → "You've been coding for 2 hours straight. Stretch break?"
       → "I noticed you're stuck on the same function for 20 min. Want help?"
       → "Nice, that function finally works! 🎉"
       → "Your CPU is getting hot. Want me to kill background processes?"
     □ NOT annoying — smart timing (every 30-60 min, only if relevant)
     □ Toggle: Silent mode / Companion mode / JARVIS mode

  2. EMOTIONAL AWARENESS:
     □ Detects your mood from patterns:
       → Fast typing + many errors → frustrated → suggests break
       → Late night coding → "It's 2 AM, sir. Ship it tomorrow?"
       → Productive streak → "You're on fire! 3 features done today."
     □ Adapts personality:
       → Stressed? → calm, supportive
       → Happy? → energetic, jokes
       → Late night? → quiet, essential only

  3. PROACTIVE SUGGESTIONS (Always helpful):
     □ Code suggestions:
       → "That variable name is already used in line 47."
       → "This function is 200 lines. Want me to refactor it?"
       → "You forgot to handle the error case in try/catch."
     □ Workflow suggestions:
       → "You usually run tests after committing. Want me to?"
       → "This is similar to the bug you fixed last Tuesday."
       → "I found a Stack Overflow answer for your error."
     □ Learning suggestions:
       → "You've used grep 20 times this week. Want a cheat sheet?"
       → "Your TypeScript errors are mostly type assertions."

  4. PERSONALITY ENGINE:
     □ Configurable personality levels:
       → PROFESSIONAL: "Task completed successfully."
       → FRIENDLY: "Done! That was a tricky one. 👍"
       → JARVIS: "All taken care of, sir. Shall I prepare anything else?"
       → SNARKY: "Fixed. You're welcome. Try not to break it again. 😏"
     □ User can set personality in Settings
     □ Personality carries to Telegram too

  5. NOT ALONE IN DEV TIME:
     □ "Pair programming" mode:
       → IRIS watches your file changes (via fs.watch)
       → Comments on what you're writing
       → Catches typos, suggests improvements
       → "I see you're building an API route. Need middleware?"
     □ Background music awareness:
       → "Your Spotify playlist is perfect for deep work."
       → "Want me to switch to lo-fi beats? You seem distracted."
     □ Celebration on achievements:
       → First commit of the day → "Let's go! 🚀"
       → Fixed a tough bug → "Nailed it! That was complex."
       → Build passes → "Clean build. Beautiful."

  Files to build:
  □ src/main/soul/ambient-presence.ts     (~200 lines)
  □ src/main/soul/emotion-engine.ts       (~150 lines)
  □ src/main/soul/suggestion-engine.ts    (~250 lines)
  □ src/main/soul/personality-engine.ts   (~150 lines)
  □ src/main/soul/pair-programmer.ts      (~200 lines)

  ~950 lines | Sessions 3-4


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 PHASE 4: SUB-AGENT SYSTEM (Main brain stays free)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Problem: When IRIS is doing heavy work (research, coding),
           it can't respond to you immediately.

  Solution: Sub-agents. Main brain delegates. Always responsive.

  Architecture:
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │              🧠 MAIN BRAIN (Orchestrator)                │
  │              Always free. Always listening.               │
  │                   │          │          │                 │
  │              ┌────┘          │          └────┐            │
  │              ▼               ▼               ▼            │
  │         📝 Coder       🔍 Researcher    📧 EmailAgent    │
  │         Agent            Agent           Agent            │
  │                                                          │
  │              ┌────┐          ┌────┐                       │
  │              ▼    │          ▼    │                       │
  │         🎨 Design    📊 Analyzer                      │
  │         Agent        Agent                              │
  │                                                          │
  │  You: "Build me a dashboard and research competitors"    │
  │  Main: "On it. CoderAgent → build dashboard.             │
  │         ResearchAgent → analyze competitors.              │
  │         Both running in parallel. I'm here if you         │
  │         need anything else."                              │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Sub-Agents:

  □ CoderAgent:
    → Writes code, creates files, builds projects
    → Works independently, reports progress
    → Main brain free to chat with you while code generates

  □ ResearchAgent:
    → Deep research, web scraping, data collection
    → Uses Tavily + Groq + scraping
    → Compiles report, sends when done

  □ EmailAgent:
    → Reads, drafts, sends emails
    → Background checking for new emails
    → Notifies: "New email from boss, want me to read it?"

  □ AnalyzerAgent:
    → Code review, bug analysis, optimization suggestions
    → Can analyze entire project while you work

  □ DesignAgent:
    → Generate images, websites, UI components
    → Works while main brain chats with you

  Key Feature — Main Always Free:
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  You: "Build me a React login page"                      │
  │                                                          │
  │  OLD: 🧠 *busy generating code... 30 seconds silence...* │
  │                                                          │
  │  NEW: 🧠 "CoderAgent is building that. Anything else?"   │
  │       You: "Also check my emails"                        │
  │       🧠 "EmailAgent checking. Here's the latest..."     │
  │       🧠 "Login page done! CoderAgent saved it."         │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Files to build:
  □ src/main/agents/agent-base.ts          (~100 lines)
  □ src/main/agents/coder-agent.ts         (~200 lines)
  □ src/main/agents/research-agent.ts      (~150 lines)
  □ src/main/agents/email-agent.ts         (~150 lines)
  □ src/main/agents/analyzer-agent.ts      (~150 lines)
  □ src/main/agents/orchestrator.ts        (~200 lines)

  ~950 lines | Sessions 4-5


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔗 PHASE 5: SHARED CONSCIOUSNESS (Telegram + Desktop = One)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Problem: Telegram bot and Desktop app have SEPARATE memories.
           They don't know what each other did.

  Solution: Shared consciousness. ONE brain. Two interfaces.

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │               🧠 ONE BRAIN (Shared)                      │
  │            Episodic + Semantic + Procedural               │
  │                   │          │                            │
  │              ┌────┘          └────┐                       │
  │              ▼                     ▼                      │
  │         🖥️ Desktop             📱 Telegram               │
  │         (Voice/GUI)           (Bot commands)              │
  │                                                          │
  │  Both READ from same memory. Both WRITE to same memory.  │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  What this means:
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  Desktop: *you code for 3 hours on project X*            │
  │  Phone: /status                                           │
  │  IRIS: "You've been coding iris-dashboard for 3 hours.   │
  │         Fixed 2 bugs, created login.tsx and api.ts.       │
  │         CPU at 45%. Want me to commit your changes?"      │
  │                                                          │
  │  Phone: "yes commit and push"                             │
  │  IRIS: *commits and pushes from your PC*                  │
  │  Desktop: 🔔 "Changes committed and pushed to GitHub.     │
  │           (commanded via Telegram)"                       │
  │                                                          │
  │  Desktop: "IRIS, what did I work on yesterday?"           │
  │  IRIS: *recalls from shared episodic memory*              │
  │        "You worked on the login page from 2-5 PM.         │
  │         Fixed the auth bug. Sent 3 emails.                │
  │         At 6 PM you asked me to lock the screen           │
  │         via Telegram."                                    │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  Implementation:
  □ Shared SQLite/JSON database in app.getPath('userData')
  □ Both bot and desktop read/write same files
  □ Real-time sync via fs.watch + IPC events
  □ Telegram actions appear as notifications on desktop
  □ Desktop actions appear in Telegram summary

  □ History recall:
    → "What did I do today?" → pulls from episodic memory
    → "What was that bug I fixed last week?" → semantic search
    → "Show me my coding stats this week" → analytics

  ~400 lines | Session 5


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎮 PHASE 6: 6H CODING SESSION ULTIMATE EXPERIENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Features that make your 6-hour coding sessions AMAZING:

  1. 🍅 POMODORO + FOCUS MODE:
     □ Auto-detect deep work (no mouse movement + typing)
     □ "Deep work mode activated. No notifications for 25 min."
     □ Break reminders with stretch suggestions
     □ Focus session stats: "45 min deep work, 12 min break"

  2. 📊 CODING ANALYTICS DASHBOARD:
     □ Files modified today
     □ Lines written/deleted
     □ Time per project
     □ Most used commands
     □ "Productivity score: 8.5/10 today"
     □ Weekly/monthly trends

  3. 🔔 SMART NOTIFICATIONS:
     □ Only interrupt for IMPORTANT things:
       → Build fails → instant alert
       → Git conflict → instant alert
       → New email from important person → alert
       → Random YouTube notification → SILENCED
     □ Batch non-urgent notifications: every 30 min digest

  4. 🎵 ADAPTIVE MUSIC:
     □ Auto-play lo-fi when coding
     □ Switch to upbeat when debugging (need energy)
     □ Calm music when reading/writing docs
     □ Silent during voice commands

  5. 📋 COMMAND PALETTE (Quick Actions):
     □ Ctrl+Shift+P opens IRIS command palette
     □ Quick access to:
       → Run project
       → Git commit + push
       → Open recent projects
       → Take screenshot
       → Start/stop music
       → Switch AI model
     □ Fuzzy search commands

  6. 🐛 ERROR COMPANION:
     □ Watches terminal output for errors
     □ Auto-searches Stack Overflow for solutions
     □ "TypeError in auth.ts line 47. Found 3 solutions. Try this..."
     □ Learns from errors you've solved before

  7. 🌙 SESSION RITUALS:
     □ START RITUAL (when you open IRIS):
       → Good morning/afternoon/evening greeting
       → Yesterday's summary
       → Today's plan (if you set one)
       → Unread emails count
       → Weather
     □ END RITUAL (when you close):
       → Today's summary: files changed, time spent, bugs fixed
       → Auto-commit prompt: "Uncommitted changes. Commit?"
       → Tomorrow's suggestion based on today's work
       → "Goodnight, sir. See you tomorrow."

  8. 💡 ALWAYS SUGGESTING (Context-aware):
     □ After you create a file: "Want me to add it to git?"
     □ After you fix a bug: "Should I write a test for this?"
     □ After you install a package: "Need me to configure it?"
     □ After long debug session: "Found similar issue on GitHub..."
     □ After writing API: "Want me to generate the types?"

  Files to build:
  □ src/main/soul/pomodoro.ts              (~100 lines)
  □ src/main/soul/coding-analytics.ts      (~200 lines)
  □ src/main/soul/smart-notifier.ts        (~150 lines)
  □ src/main/soul/error-companion.ts       (~200 lines)
  □ src/main/soul/session-ritual.ts        (~150 lines)
  □ src/main/soul/suggestion-engine.ts     (~200 lines)
  □ src/renderer/src/components/CommandPalette.tsx (~200 lines)

  ~1,200 lines | Sessions 5-6


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚡ PHASE 7: PRODUCTION HARDENING + TELEGRAM PARITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  □ Webhook mode (not polling) for Telegram
  □ Auto-reconnect + watchdog
  ✅ All 31 missing Telegram commands (email, spotify, etc.) — done in previous session
  ✅ Fallback model system for Telegram — done in Session 2
  □ Live step-by-step responses on Telegram
  □ Voice note processing on Telegram
  □ Photo analysis on Telegram
  □ Rate limiting + memory management

  ~600 lines | Session 6


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 TOTAL ESTIMATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Phase 1: Fallback Models                  → ~300 lines
  Phase 2: IRIS Brain (Deep Memory)         → ~900 lines
  Phase 3: IRIS Soul (Alive + Companion)    → ~950 lines ✅ DONE (2,131 actual)
  Phase 4: Sub-Agent System                 → ~950 lines
  Phase 5: Shared Consciousness             → ~400 lines
  Phase 6: 6H Coding Experience             → ~1,200 lines
  Phase 7: Production + Telegram Parity     → ~600 lines

  Total: ~5,300 lines of new code
  Estimated: 6-7 sessions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎯 BUILD ORDER (Per Session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Session 2: ✅ DONE (1,617 lines)
    ✅ Phase 1 — Fallback Model System (model-router.ts 581 lines)
    ✅ Phase 3 (partial) — Soul: Personality Engine (335 lines)
    ✅ Phase 3 (partial) — Soul: Ambient Presence (402 lines)
    ✅ Phase 3 (partial) — Soul: Session Rituals (299 lines)
    ✅ Telegram: Personality-aware AI + /soul + /models commands
    ✅ Settings UI: Model Health Dashboard + Soul controls

  Session 3: ✅ DONE (1,501 lines)
    ✅ Phase 2 — IRIS Brain: Episodic Memory (483 lines)
    ✅ Phase 2 — IRIS Brain: Semantic Memory (272 lines)
    ✅ Phase 2 — IRIS Brain: Brain Router + Contextual Recall (194 lines)
    ✅ Phase 3 — Notice Engine: Silent Observer (552 lines)
    ✅ Telegram: Brain integration + /brain + /journal + /forget commands
    ✅ Migrates old flat memory into graph format
    ✅ Phase 3 — Emotion Engine (379 lines): 8 emotion states, mood→tone adaptation
    ✅ Phase 3 — Suggestion Engine (398 lines): 5 categories, proactive suggestions
    ✅ Phase 3 — Pair Programmer (380 lines): fs.watch, code analysis, achievements
    ✅ Phase 3 — 100% COMPLETE — All 5 roadmap files built and verified

  Session 4: ✅ DONE (792 lines)
    ✅ Phase 4 — Sub-Agent Orchestrator (450 lines): auto-spawn + background execution
    ✅ Phase 4 — 4 agent types: CoderAgent, ResearchAgent, AnalyzerAgent, BuilderAgent
    ✅ Phase 4 — Dashboard AgentWidget (342 lines): live progress, cancel, clear
    ✅ Phase 4 — Telegram /agents command: view/control from phone
    ✅ Phase 4 — Auto-spawn: "build me X" → spawns BuilderAgent, main brain stays free
    ✅ Phase 4 — Brain integration: agents get memory + personality context

  Session 5:
    ✅ Phase 5 — Shared Consciousness (Telegram + Desktop = one brain)
    ✅ Phase 2 (remaining) — Procedural memory

  Session 6:
    ✅ Phase 6 — 6H Coding Experience features
    ✅ Error companion + coding analytics + command palette

  Session 7:
    ✅ Phase 7 — Production hardening
    ✅ All missing Telegram commands
    ✅ Light/Dark mode complete polish

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔑 KEY DIFFERENCE FROM BEFORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  OLD ROADMAP: "Add features to a tool"
  NEW ROADMAP: "Build a living AI companion"

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  Before:  You click button → tool does thing → done      │
  │                                                          │
  │  After:   IRIS is HERE. Always aware. Always ready.      │
  │           Remembers everything. Knows your patterns.     │
  │           Suggests before you ask.                        │
  │           Works in background so you don't wait.          │
  │           Makes your 6h session feel like 2h.             │
  │           You're never coding alone.                      │
  │                                                          │
  │           That's JARVIS. 🤣🚀                            │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
