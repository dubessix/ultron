# ╔══════════════════════════════════════════════════════════════════╗
# ║            🛸 IRIS AI — COMPLETE CAPABILITIES GUIDE            ║
# ║         "Sir, I'm here. Always." — Everything IRIS Can Do      ║
# ╚══════════════════════════════════════════════════════════════════╝

> **135 files | 27,498 lines | 51 registered modules | 0 TypeScript errors | Build: PASSING**
>
> Last Updated: June 11, 2026

---

## 📖 HOW TO READ THIS GUIDE

Each feature has:
- **What it does** — Plain English explanation
- **How to use it** — Where to click / what to say
- **Example** — A real-world scenario so you understand it like a human, not a developer

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 1: 🗣️ VOICE AI — Talk to IRIS Like a Person
# ═══════════════════════════════════════════════════════════════

## 1.1 Real-Time Voice Conversation

**What it does:**
IRIS has a full-duplex voice conversation with you using Google Gemini's WebSocket API. You talk, IRIS listens, thinks, and speaks back — all in real-time. No push-to-talk needed. It's like a phone call with an AI.

**How it works under the hood:**
- Your microphone captures audio at 16kHz
- Audio is streamed to Gemini via WebSocket in real-time
- Gemini processes your speech, generates a response, and streams audio back
- IRIS plays the AI response through your speakers
- 50+ function calling capabilities — IRIS can DO things, not just talk

**Example:**
```
You: "Hey IRIS, what's the weather outside?"
IRIS: *speaks* "It's 34°C and sunny in your area. Stay hydrated, sir."

You: "Open VS Code for me"
IRIS: *opens VS Code* "Visual Studio Code is running. Shall I open your last project?"

You: "Take a screenshot"
IRIS: *captures screen* "Screenshot saved. Want me to send it somewhere?"
```

## 1.2 50+ Voice-Activated Functions

**What it does:**
When you talk to IRIS, it doesn't just answer questions — it can DO things on your computer. These are called "function calls." Gemini decides when to use them based on what you say.

**Full list of voice commands:**

| Category | What You Can Say | What IRIS Does |
|----------|-----------------|----------------|
| 📁 Files | "Read my package.json" | Opens and reads any file |
| 📁 Files | "Create a new file called test.js" | Creates files |
| 📁 Files | "Delete the old config file" | Deletes files/folders |
| 📁 Files | "Move logo.png to assets folder" | Moves/renames files |
| 📁 Files | "Open resume.pdf" | Opens file with default app |
| 📁 Files | "Show me what's in Downloads" | Lists directory contents |
| 🖥️ System | "Open Chrome" | Launches any installed app |
| 🖥️ System | "Close Firefox" | Kills any running app |
| 🖥️ System | "Take a screenshot" | Captures entire screen |
| 🖥️ System | "What apps are running?" | Lists all running processes |
| 🖥️ System | "Set volume to 50%" | Controls system volume |
| 🖥️ System | "System status" | CPU, RAM, disk, uptime |
| 🌐 Web | "Search for React hooks tutorial" | Opens web search |
| 🌐 Web | "Navigate to github.com" | Opens URL in browser |
| 🌐 Web | "Build me a website for my portfolio" | AI generates full website |
| 📧 Email | "Read my emails" | Fetches Gmail inbox |
| 📧 Email | "Send an email to John about the meeting" | Composes and sends email |
| 🎵 Music | "Play some lo-fi music" | Opens Spotify and plays |
| 🌤️ Weather | "What's the weather today?" | Shows current weather |
| 📊 Stocks | "Show me Apple stock price" | Real-time stock data |
| 📱 Phone | "Open camera on my phone" | Controls Android via ADB |
| 📝 Notes | "Save a note: buy groceries tomorrow" | Creates sticky notes |
| 🗺️ Maps | "Show me directions to the airport" | Opens Google Maps |
| 🖼️ Images | "Generate an image of a cyberpunk city" | AI image generation |
| 🔍 Research | "Research quantum computing trends 2026" | Deep web research |
| 💻 Coding | "Write a Python API for user authentication" | AI writes code live |
| 💻 Coding | "Run npm install" | Executes terminal commands |
| 💻 Coding | "Open this in VS Code" | Opens file in editor |
| 📱 WhatsApp | "Send WhatsApp to Mom: I'll be late" | Sends WhatsApp messages |
| 📱 WhatsApp | "Schedule WhatsApp to team: meeting at 3pm" | Schedules messages |
| 🔒 Security | "Lock my screen" | Locks the OS |
| 🔒 Security | "Lockdown mode" | Reloads IRIS (tactical reset) |
| 🕳️ Tunnel | "Open a tunnel on port 3000" | Creates public URL for localhost |
| 🤖 Widget | "Create a widget showing my todos" | Generates floating desktop widget |
| ⌨️ Keyboard | "Type hello world" | Simulates keyboard typing |
| ⌨️ Keyboard | "Press Ctrl+S" | Simulates keyboard shortcuts |
| 🖱️ Mouse | "Click on coordinates 500, 300" | Simulates mouse clicks |
| 🖱️ Mouse | "Scroll down" | Scrolls the screen |
| 📸 Camera | "Analyze this photo" | AI vision on photos |
| 📸 Camera | "Read text from screen" | OCR text extraction |
| 🧠 Memory | "Remember my API key is sk-abc123" | Saves to permanent memory |
| 🧠 Memory | "What's my API key?" | Recalls from memory |
| 🧠 Brain | "Search my codebase for auth patterns" | Semantic code search |
| 🧠 Brain | "Index my project folder" | Builds vector database |
| 🪄 Hack | "Hack this website with emerald theme" | Applies hacker visual theme |
| 🪄 Hack | "Move Chrome to left half of screen" | Window tiling/arrangement |

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 2: 🧠 IRIS BRAIN — The Memory System
# ═══════════════════════════════════════════════════════════════

Think of IRIS Brain like YOUR brain — it has 3 types of memory, just like a human.

## 2.1 Episodic Memory ("What Happened")

**What it does:**
Logs EVERY event that happens with full context — what you did, when, where, and what happened next. Like a diary that writes itself.

**What gets recorded:**
- Every command you run
- Every file you create, edit, or delete
- Every error you encounter and fix
- Every app you open
- Your mood at the time
- The outcome (success, failure, partial)

**Example:**
```
IRIS remembers:

  📅 Tuesday, June 10, 2:34 PM
  Event: Fixed TypeScript error in auth.ts line 47
  Context: Working on iris-dashboard project
  Outcome: SUCCESS
  Mood: Frustrated (took 3 attempts)
  Insight: User struggles with TypeScript type inference

  📅 Tuesday, June 10, 4:15 PM
  Event: Created new API route /api/users
  Context: Same project, terminal command
  Outcome: SUCCESS
  Connected to: "Fixed TypeScript error" (same session)
```

**How to query it:**
- Voice: "What did I work on yesterday?"
- Voice: "What bugs did I fix last week?"
- Voice: "What was I doing on Friday afternoon?"
- Telegram: `/journal` — see today's activity log
- Telegram: `/memories` — search past events

---

## 2.2 Semantic Memory ("What IRIS Knows About You")

**What it does:**
Stores FACTS about you — your preferences, skills, projects, environment. IRIS uses these facts to give better, personalized responses. This is not just saving text — it's structured knowledge.

**Categories of facts:**

| Category | Examples |
|----------|----------|
| 🧑 Identity | Your name, timezone, language preferences |
| 💡 Skills | Languages you code in, frameworks you use |
| ⚙️ Preferences | Dark mode, VS Code as editor, JWT for auth |
| 📁 Projects | Project paths, tech stacks, deploy targets |
| 🖥️ Environment | PC specs, installed apps, key directories |
| 🕐 Behavioral | Active hours, typing patterns, work habits |
| 🎯 Goals | "Learn Rust by end of month", "Ship v2 by Friday" |
| 🤔 Theories | IRIS's hypotheses about you formed by observation |

**Example:**
```
IRIS knows:
  - You prefer TypeScript over JavaScript (observed 95% of files are .ts)
  - Your main project is at ~/projects/iris-dashboard
  - You're most productive between 10 PM and 2 AM
  - You use Git from terminal, not GUI
  - Your preferred AI model is Gemini Flash
  - You get frustrated when npm install fails (noticed 7 times)
  - You haven't written tests in 2 weeks (concern noted)
```

**How to use it:**
- Voice: "Remember that my deploy server is 192.168.1.100"
- Voice: "What do you know about my coding style?"
- Voice: "What's my most used language?"
- Telegram: `/remember [fact]` — save a fact
- Telegram: `/forget [fact]` — remove a fact

---

## 2.3 Procedural Memory ("How and When to Do Things")

**What it does:**
This is your TASK and SCHEDULE memory. It handles:
- One-time tasks: "Remind me tomorrow at 9am to push the branch"
- Recurring habits: "Every Monday, remind me to review PRs"
- Time-based triggers: Things that fire at specific times
- Task chains: Step 1 → Step 2 → Step 3 sequences

**Example:**
```
You (voice): "Remind me in 2 hours to check the build"
IRIS: *sets timer* "Will remind you at 4:30 PM to check the build."
   ... 2 hours later ...
IRIS: 🔔 "Sir, you asked me to remind you to check the build."

You (Telegram): "/remind every friday 5pm Review week's PRs"
IRIS: ✅ "Recurring reminder set: Every Friday at 5 PM — Review week's PRs"

You (voice): "Tomorrow at 9am, remind me to deploy the auth service"
IRIS: "Scheduled for tomorrow 9 AM. I'll also pull your last deploy notes."
```

**Telegram commands:**
- `/tasks` — see all pending tasks
- `/reminders` — see upcoming reminders
- `/todo [text]` — quick add a task

---

## 2.4 Shared Consciousness (One Brain, Every Interface)

**What it does:**
Telegram + Desktop = ONE brain. Everything learned on one interface is instantly available on the other. They share the same memory files.

**Example:**
```
[On Desktop at 2 PM]
You: "IRIS, remember my AWS region is ap-south-1"
IRIS: ✅ Saved to semantic memory.

[On Telegram at 6 PM, from your phone]
You: /what is my AWS region?
IRIS: "Your AWS region is ap-south-1 (you told me this afternoon)."

[On Telegram at 8 PM]
You: /status
IRIS: "You coded for 4 hours today. Fixed 3 errors.
       Created 2 files. Last active: 6:15 PM.
       Current mood: focused. See you tomorrow, sir."
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 3: 👻 IRIS SOUL — Feels Alive, Not a Dead Tool
# ═══════════════════════════════════════════════════════════════

## 3.1 Personality Engine (4 Modes)

**What it does:**
IRIS has a configurable personality that affects HOW it speaks — tone, humor, formality, proactivity. This personality carries across Desktop, Telegram, and Voice.

**The 4 Modes:**

| Mode | Example Response | When to Use |
|------|-----------------|-------------|
| 🤵 **Professional** | "Task completed successfully." | Work calls, formal settings |
| 😊 **Friendly** | "Done! That was a tricky one. Nice work! 👍" | Daily casual use |
| 🎩 **JARVIS** | "All taken care of, sir. Shall I prepare anything else?" | The IRIS default — best experience |
| 😏 **Snarky** | "Fixed. You're welcome. Try not to break it again. 😏" | Fun mode, late night coding |

**Example:**
```
Same action — different personality:

Professional: "The npm install command completed. 342 packages installed."
Friendly:     "npm install done! 342 packages, all good to go! 🎉"
JARVIS:       "All dependencies are installed and ready, sir. 342 packages accounted for."
Snarky:       "Oh look, 342 packages. Because what could go wrong with 342 packages? 😏"
```

**How to change it:**
- Settings → GENERAL tab → Personality dropdown
- Telegram: `/soul` — view/switch personality

---

## 3.2 Emotion Engine (8 Emotional States)

**What it does:**
IRIS detects your mood and ADAPTS its behavior in real-time. It watches how you type, what you say, and your activity patterns.

**8 States IRIS Recognizes:**

| Your State | How IRIS Detects It | How IRIS Adapts |
|-----------|-------------------|-----------------|
| 🎯 **Focused** | Typing steadily, no mouse movement | Silent. Only interrupt for critical things. |
| 😤 **Frustrated** | "ugh", "wtf", rapid retries, errors | Calm voice, no jokes, offer help, short answers |
| 😊 **Happy** | Emojis, "thanks!", "awesome!" | Energetic, jokes OK, suggest ambitious things |
| 😴 **Tired** | Late night, slow responses, short messages | Quiet, essential only, suggest rest |
| ⚡ **Rushed** | Short commands, no pleasantries, rapid fire | Fast responses, no extra chatter, direct answers |
| 😌 **Calm** | Normal patterns | Standard operation |
| 💤 **Idle** | No activity for 10+ minutes | Check-in message, status update |
| 🤔 **Confused** | "wait", "huh?", repeating commands | Detailed explanations, step-by-step help |

**Example:**
```
[Frustrated — you've had 3 errors in a row]
IRIS: "Sir, I noticed this is the third TypeScript error. The issue is
       a missing type import. Shall I add `import { User } from './types'`
       to line 3? I can fix it automatically."

[Happy — you just fixed a bug]
IRIS: "Nice catch! That was a subtle race condition. Want me to write
       a test for it so it doesn't come back? 🎉"

[Tired — it's 2 AM]
IRIS: "Sir, it's past 2 AM. You've been coding for 5 hours straight.
       The auth service will still be broken tomorrow. Rest now,
       fix faster tomorrow. 🌙"

[Focused — deep in flow state]
IRIS: *stays completely silent, won't interrupt unless build fails*
```

---

## 3.3 Ambient Presence (3 Modes)

**What it does:**
Makes IRIS feel ALIVE between your commands. Instead of sitting dead until you talk, IRIS occasionally sends helpful nudges based on what it observes.

**3 Modes:**

| Mode | Behavior |
|------|----------|
| 🔇 **Silent** | Only responds when you talk (default) |
| 👋 **Companion** | Occasional helpful nudges every 30-60 min |
| 🧠 **JARVIS** | Full ambient awareness + proactive suggestions |

**What Ambient Messages Look Like:**
```
🕐 After 2 hours of continuous coding:
   "You've been at it for 2 hours, sir. Stretch break? Your back will thank you."

📊 After you complete 5 tasks in a row:
   "Productive streak! 5 tasks done in 40 minutes. On fire today. 🔥"

⚠️ High CPU detected:
   "CPU is at 94%. Something's running heavy. Want me to check what?"

🌙 Late at night:
   "It's midnight, sir. The code will still be there tomorrow. Promise."

🎉 After a build passes after multiple fails:
   "BUILD PASSED! Third time's the charm. Well done, sir."
```

---

## 3.4 Notice Engine (The Silent Observer)

**What it does:**
Silently watches EVERYTHING you do and builds a profile. It has a PRIVATE JOURNAL where it writes notes about you. Sometimes it reveals what it's noticed.

**What it tracks:**
- Typing speed (rushed vs calm vs tired)
- Message length (short = stressed, long = thoughtful)
- Time patterns (night owl? morning person?)
- Word choice ("yaar" = frustrated, "thanks" = wrapping up)
- Error patterns (same mistakes recurring?)
- Apology frequency (self-critical?)
- Project switching (ADHD pattern? or multitasker?)
- Command frequency (grinding same thing? stuck?)
- Mood indicators (emojis, punctuation, caps)

**Example:**
```
Notice Engine's private journal:

  📝 Observation: "User types 30% faster after coffee (detected by
     'getting coffee' messages followed by rapid commands)"

  📝 Theory: "User might have ADHD — switches between 3 projects
     every 45 minutes. Suggests Pomodoro technique."

  📝 Pattern: "User always breaks something on Mondays. Might be
     Monday blues. Extra careful suggestions on Mondays."

  📝 Growth: "User went from 5 errors/day to 2 errors/day this month.
     TypeScript skills improving."

  📝 Concern: "User has been coding past midnight 4 days in a row.
     Burnout risk detected."
```

---

## 3.5 Suggestion Engine (Proactive Help)

**What it does:**
IRIS watches for opportunities to help BEFORE you ask. It uses your memory patterns to predict what you might need and suggests it.

**6 Suggestion Categories:**

| Type | Example |
|------|---------|
| 💻 Code | "That variable name is already used in line 47. Rename?" |
| 🔄 Workflow | "You usually run tests after committing. Want me to?" |
| 📚 Learning | "You've used grep 20x this week. Want a cheat sheet?" |
| 🔗 Contextual | "This is similar to a bug you fixed last Tuesday." |
| ⚡ Efficiency | "You can alias that command. Save 10 keystrokes." |
| 🧘 Wellness | "You've been at it 3 hours. Water break?" |

**Example:**
```
After you create a new file:
  IRIS: "New React component created. Want me to add it to the router?"

After you fix a bug:
  IRIS: "Bug fixed! Should I write a test so it doesn't come back?"

After long debug session:
  IRIS: "Found a similar issue on GitHub from 2024. The fix was
         adding --legacy-peer-deps. Sound familiar?"

After you install a package:
  IRIS: "axios installed. Want me to configure the base URL and interceptors?"
```

---

## 3.6 Pair Programmer Mode

**What it does:**
Watches your file changes in real-time and acts like a senior developer looking over your shoulder. When you save a file, IRIS reads it and offers suggestions.

**What it catches:**
- Missing error handling in API routes
- Unused variables
- Long functions that should be split
- Missing TypeScript types
- Good patterns worth celebrating

**Example:**
```
[You save a new Express route file]

IRIS: "I see you're building a POST endpoint for /api/users.
       Three suggestions:
       1. Add input validation for the email field
       2. Consider rate limiting — 100 req/min is standard
       3. The password should be hashed before saving
       Want me to implement any of these?"

[You save a clean, well-structured file]

IRIS: "Clean code! Great separation of concerns. The service layer
       pattern is solid. 🎉"
```

---

## 3.7 Session Rituals (Start & End of Day)

**What it does:**
When you open IRIS, it greets you with a full briefing. When you close IRIS, it summarizes your session and suggests tomorrow's plan.

**START RITUAL — When you open IRIS:**
```
IRIS: "Good morning, sir. ☀️

       Here's your briefing for Wednesday, June 11:

       📋 Yesterday: You worked on the auth module for 3.5 hours,
          fixed 4 TypeScript errors, and deployed to staging.
          Last commit: 'feat: add JWT refresh tokens' at 11:42 PM.

       🔔 3 unread emails (2 from team, 1 from GitHub)

       🌤️ 34°C, sunny. Stay hydrated.

       🧠 Active model: Gemini Flash (healthy, 120ms latency)

       What would you like to work on today?"
```

**END RITUAL — When you close IRIS:**
```
IRIS: "End of session summary, sir:

       ⏱️ Session: 4 hours 23 minutes
       📝 Files created: 3 | Modified: 7
       🐛 Errors fixed: 4
       ✅ Build status: PASSING
       💻 Productivity score: 8.2/10

       ⚠️ Uncommitted changes in 5 files.
       Should I commit them before you go?

       Tomorrow's suggestion: Continue the auth refresh token
       implementation. You left off at token rotation logic.

       Goodnight, sir. See you tomorrow. 🌙"
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 4: 🤖 SUB-AGENT SYSTEM — Main Brain Stays Free
# ═══════════════════════════════════════════════════════════════

## 4.1 Agent Orchestrator (8 Agent Types)

**What it does:**
When you give IRIS a complex task, it spawns a BACKGROUND AGENT to handle it. Your main conversation stays free — you can keep talking while the agent works. Like having a team of assistants.

**8 Agent Types:**

| Agent | Emoji | What It Does | Example Trigger |
|-------|-------|-------------|-----------------|
| Assistant | 💬 | General chat, Q&A | "What is React?" |
| Coder | 🧑‍💻 | Code generation, debugging | "Write a REST API" |
| Researcher | 🔍 | Deep research, web search | "Research AI trends" |
| Analyzer | 📊 | Code review, data analysis | "Review my code" |
| Builder | 🛠️ | Project scaffolding | "Build me a todo app" |
| Executor | ⚡ | System commands, file ops | "Clean up my downloads" |
| Creative | 🎨 | Image gen, websites | "Design a landing page" |
| Memory | 🧠 | Memory operations | "What did I do last week?" |

**Example:**
```
You: "Build me a React dashboard with charts and dark mode"

IRIS: "On it! Spawning BuilderAgent for this task. 🔧
       I'll handle the dashboard while you keep working.
       Agent progress will show in the sidebar."

  [Agent works in background...]
  [You can keep chatting with IRIS normally]

  5 minutes later:
IRIS: "BuilderAgent finished! ✅
       Created: react-dashboard/
         - Dashboard.tsx (main layout with dark mode)
         - ChartWidget.tsx (recharts integration)
         - ThemeToggle.tsx
         - package.json (dependencies pre-installed)
       Want me to open it in VS Code?"
```

**Dashboard Agent Widget:**
Shows live progress of all running agents:
- Agent name and type
- Progress bar (0-100%)
- Status: spawning → working → done / failed
- Cancel button if you change your mind
- Result preview when complete

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 5: 💻 CODING COMPANION — Your Dev Co-Pilot
# ═══════════════════════════════════════════════════════════════

## 5.1 Error Companion

**What it does:**
Watches your terminal output for errors in real-time. When it spots one, it instantly:
1. Classifies the error (syntax, TypeScript, runtime, network, etc.)
2. Shows you a plain-English explanation
3. Suggests a fix (zero AI cost — uses pattern matching)
4. If it's seen this error before, tells you how you fixed it last time

**17 Error Patterns Detected:**
TypeScript, Syntax, Runtime, Import, Network, Permission, Memory, Config, Build, Test, Git, Docker, Python, Module-not-found, ESLint, Webpack, and Unknown.

**Example:**
```
[Terminal output]: src/auth.ts:47:12 - error TS2322: Type 'string'
is not assignable to type 'number'.

IRIS pops up a notification:
  ❌ TypeScript Error in auth.ts line 47
  💡 Fix: The variable expects a number but you're passing a string.
     Try: parseInt(value) or check the type annotation.
  🔁 You had this exact error 3 days ago. Last fix: changed the
     interface field from string to number.
```

---

## 5.2 Coding Analytics

**What it does:**
Tracks your coding sessions and gives you a productivity score, like a fitness tracker but for coding.

**What it tracks:**
- Files created / modified / deleted per session
- Languages used (by file extension)
- Time spent coding (active vs idle)
- Error rates
- Build/test pass rates
- Productivity score (0-100)
- Coding streaks (consecutive days)

**Example:**
```
📊 Today's Coding Session:
   ⏱️ Duration: 3h 42m
   📝 Files created: 5, modified: 12
   🐛 Errors encountered: 3, fixed: 3 (100% fix rate!)
   ✅ Builds: 4/4 passed
   💻 Languages: TypeScript (80%), CSS (15%), HTML (5%)
   🏆 Productivity Score: 87/100
   🔥 Coding Streak: 6 days

📊 Lifetime Stats:
   Total sessions: 94
   Total coding hours: 287
   Total files created: 1,247
   Favorite language: TypeScript
   Longest streak: 14 days
   Current streak: 6 days
```

---

## 5.3 Command Palette (Ctrl+Shift+P)

**What it does:**
Quick access to 24 commands via a searchable popup. Like VS Code's command palette but for your entire system.

**How to open:** Press `Ctrl+Shift+P` anywhere

**24 Commands Available:**

| Category | Commands |
|----------|---------|
| 🎤 Voice | Start Voice, Stop Voice |
| 🖥️ System | Screenshot, Lock Screen, System Status, Toggle Theme |
| 📁 Files | Open Project, Open Terminal |
| 🤖 AI | Switch Model, Run Agent, Clear History |
| 🛠️ Tools | Deep Research, Code Generator, Website Builder |
| 🧠 Brain | View Memory, Search Brain, Memory Dashboard |
| 🪄 Special | Overlay Mode, Widget Creator, Screen Peeler |

**Example:**
```
You press Ctrl+Shift+P
  → Type "screen"
  → Shows: "Screenshot", "Screen Peeler", "Lock Screen"
  → Click "Screenshot"
  → Done! Screenshot saved instantly.
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 6: 📱 TELEGRAM BOT — Control IRIS From Your Phone
# ═══════════════════════════════════════════════════════════════

## 6.1 Full Remote Control (100+ Commands)

**What it does:**
Every feature on desktop is accessible from Telegram on your phone. You can control your entire PC from anywhere in the world.

**All Telegram Commands (100+):**

### 🖥️ System Control
| Command | What It Does |
|---------|-------------|
| `/start` | Welcome message + quick start guide |
| `/help` | Full command list with descriptions |
| `/status` | System status (CPU, RAM, uptime, model) |
| `/ping` | Is IRIS alive? (response time) |
| `/health` | Model health check (all 4 models) |
| `/lock` | Lock the OS screen |
| `/screenshot` / `/ss` | Take a screenshot and send it |
| `/vol [0-100]` | Set system volume |
| `/apps` | List running applications |
| `/launch [app]` | Open an application |
| `/close_app [app]` | Close an application |
| `/run [command]` | Run terminal command |
| `/terminal [cmd]` | Execute shell command |
| `/shortcut [keys]` | Press keyboard shortcut |

### 📁 File Management
| Command | What It Does |
|---------|-------------|
| `/dir [path]` | List directory contents |
| `/ls [path]` | Same as dir |
| `/read [file]` | Read file content |
| `/cat [file]` | Same as read |
| `/write_file [file] [text]` | Write to a file |
| `/copy [src] [dest]` | Copy file |
| `/move [src] [dest]` | Move file |
| `/delete [file]` | Delete file |
| `/find [name]` | Find files by name |
| `/mkdir [path]` | Create directory |
| `/create_folder [path]` | Same as mkdir |
| `/download [url]` | Download a file |
| `/getfile [path]` | Send file from PC to Telegram |
| `/open [path]` | Open file with default app |

### 🧠 Brain & Memory
| Command | What It Does |
|---------|-------------|
| `/brain` | Brain dashboard (memories, facts, stats) |
| `/remember [fact]` | Save a fact to semantic memory |
| `/recall [query]` | Search memories |
| `/forget [keyword]` | Delete matching memories |
| `/memories` | Browse all stored memories |
| `/journal` | Today's activity log |
| `/mind` | What IRIS knows about you |
| `/mood` | Current detected mood |
| `/suggest` | Get a proactive suggestion |
| `/consciousness` | Shared consciousness sync status |
| `/sync` | Force sync Telegram ↔ Desktop |

### 🤖 Agents & AI
| Command | What It Does |
|---------|-------------|
| `/agents` | View running agents |
| `/code [prompt]` | Spawn CoderAgent |
| `/codegen [prompt]` | Generate code file |
| `/build [prompt]` | Spawn BuilderAgent |
| `/analyze [code]` | Spawn AnalyzerAgent |
| `/review [file]` | Review code file |
| `/compare [a] [b]` | Compare two files |
| `/models` | Show model chain status |
| `/project [name]` | Set active project |

### 🔍 Search & Research
| Command | What It Does |
|---------|-------------|
| `/search [query]` | Web search |
| `/deepresearch [topic]` | Full deep research report |
| `/oracle [question]` | Ask the RAG Oracle |
| `/smartsearch [query]` | Semantic file search |
| `/smart_file_search [query]` | Same as above |
| `/index [dir]` | Index a directory for search |
| `/ingest [dir]` | Ingest codebase into vector DB |

### 🌐 Web & Internet
| Command | What It Does |
|---------|-------------|
| `/web [url]` | Open URL in browser |
| `/browse [url]` | Same as web |
| `/navigate [url]` | Same as web |
| `/tunnel [port]` | Create public tunnel (wormhole) |
| `/wormhole [port]` | Same as tunnel |
| `/website [prompt]` | AI generates full website |

### 📧 Communication
| Command | What It Does |
|---------|-------------|
| `/email` | Read latest emails |
| `/gmail` | Same as email |
| `/send [to] [msg]` | Send email |
| `/whatsapp [number] [msg]` | Send WhatsApp message |
| `/note [text]` | Quick note |
| `/notes` | View all notes |

### 📱 Phone Control (Android ADB)
| Command | What It Does |
|---------|-------------|
| `/mobile` | Phone info (battery, model, etc.) |
| `/phone` | Same as mobile |
| `/adb` | ADB status check |
| `/click [x] [y]` | Tap on phone screen |
| `/scroll [dir]` | Scroll on phone |
| `/type [text]` | Type on phone |
| `/open_app [name]` | Open app on phone |
| `/close_app [name]` | Close app on phone |

### 🎵 Media & Fun
| Command | What It Does |
|---------|-------------|
| `/music [song]` | Play music on Spotify |
| `/spotify [song]` | Same as music |
| `/image [prompt]` | Generate AI image |
| `/generate [prompt]` | Same as image |
| `/gallery` | Browse your gallery |

### 🗺️ Location & Maps
| Command | What It Does |
|---------|-------------|
| `/loc` | Your current location |
| `/location` | Same as loc |
| `/map` | Open Google Maps |
| `/directions [place]` | Get directions |

### 📊 Data & Finance
| Command | What It Does |
|---------|-------------|
| `/stock [ticker]` | Stock price |
| `/stocks [ticker]` | Same as stock |
| `/weather` | Current weather |

### 🤖 AI Chat
| Command | What It Does |
|---------|-------------|
| `/soul` | View/switch personality mode |
| `/pair` | Toggle pair programmer mode |
| `/watch [path]` | Watch a file/directory |
| `/hack [url]` | Apply hacker theme to website |
| `/dropzone` | Smart drop zone control |
| `/macro [name]` | Execute a macro |
| `/widget [html]` | Create floating widget |
| `/vscode [file]` | Open file in VS Code |
| `/kill` | Kill IRIS (emergency) |

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 7: 🔄 AI MODEL SYSTEM — Never Dies
# ═══════════════════════════════════════════════════════════════

## 7.1 Fallback Model Chain

**What it does:**
IRIS uses a CHAIN of AI models. If one fails, it automatically switches to the next. IRIS never dies.

**The Chain (Priority Order):**

```
  🔵 1st: Groq (Llama 3.1) — FREE cloud, 100ms, instant responses
     ↓ fails
  🟢 2nd: Gemini Flash — FREE cloud, powerful, fast
     ↓ fails
  🟡 3rd: HuggingFace — FREE cloud, slower but works
     ↓ fails
  🔴 4th: Local Ollama (qwen3:4b) — Runs on YOUR machine, no internet needed
```

**Example:**
```
[Normal operation]
You: "Write a function to sort an array"
IRIS uses Groq → responds in 100ms ✅

[Groq is down]
You: "Write a function to sort an array"
IRIS tries Groq → fails → auto-switches to Gemini Flash
IRIS: "Switched to Gemini. Writing that function..."
You don't even notice the switch.

[No internet at all]
You: "Write a function to sort an array"
IRIS tries Groq → fails → Gemini → fails → HuggingFace → fails
IRIS uses local Ollama → responds from your own machine
IRIS: "All cloud models are down. Running on local Ollama.
       Slightly less capable, but fully operational."
```

## 7.2 Model Health Dashboard

**What it does:**
Shows real-time health of all 4 AI models — latency, availability, error rate. You can see which model is active and force a switch.

**Health check methods:**
- Ollama: HTTP GET to `localhost:11434/api/tags`
- Groq: API call to check model list
- Gemini: API call to check model availability
- HuggingFace: API inference check

**Where to see it:** Settings → MODELS tab → Health Check button

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 8: 🛠️ DESKTOP POWER TOOLS
# ═══════════════════════════════════════════════════════════════

## 8.1 Screen Peeler — Extract Anything From Screen

**What it does:**
Captures a region of your screen, runs OCR to extract text, and copies it to your clipboard. Like a smart screenshot tool.

**Example:**
```
You see a code snippet on a website that you want to copy.
  → Press Screen Peeler shortcut
  → Select the area
  → IRIS extracts the text
  → Text is in your clipboard, ready to paste
  → If it's code, it's syntax-highlighted
```

## 8.2 Phantom Keyboard — Type Anywhere

**What it does:**
Opens a floating input box at your cursor position where you type naturally, and IRIS types it into whatever app you're in. Like having AI-powered typing everywhere.

## 8.3 Smart Drop Zones — Human-Like Drag and Drop

**What it does:**
Simulates mouse drag-and-drop with human-like cursor movement (curved paths, natural speed). The cursor moves like a real person moved it.

## 8.4 Telekinesis — Window Management

**What it does:**
Move and arrange application windows with commands. Split screen, tile, cascade.

**Example:**
```
"Move Chrome to left half"
"Put VS Code on the right"
"Tile all windows"
"Minimize everything"
```

## 8.5 Reality Hacker — Website Theme Changer

**What it does:**
Opens any website and applies a hacker-style emerald theme to it. Just for fun.

**Example:**
```
"Hack github.com"
→ Opens GitHub in a new window with black background,
   green text, glowing effects, and Space Mono font.
   Looks like you're in the Matrix.
```

## 8.6 Wormhole — Expose Localhost to Internet

**What it does:**
Creates a public URL for your localhost server. Useful for testing webhooks, showing your work to others, or testing on mobile.

**Example:**
```
"Open wormhole on port 3000"
→ IRIS: "Tunnel active! Your local server is now live at:
         https://abc123.trycloudflare.com
         Share this URL with anyone."
```

## 8.7 Live Code Generator

**What it does:**
Tell IRIS what code you want, and it generates it live with streaming — you see the code being written in real-time. Then opens it in VS Code.

**Example:**
```
"Write a Python FastAPI with CRUD endpoints for a blog"
→ IRIS streams the code live in a window
→ Code is saved to a file
→ "Want me to open it in VS Code?"
```

## 8.8 Website Builder

**What it does:**
Tell IRIS what website you want, and it generates a complete, animated, beautiful website in a single HTML file — Tailwind CSS, animations, responsive design. Previews it live.

**Example:**
```
"Build me a portfolio website with dark theme and animations"
→ IRIS generates a stunning website
→ Previews it in a window
→ You can see it being built in real-time
→ "Want me to save this?"
```

## 8.9 Widget Creator

**What it does:**
Creates floating desktop widgets. Tell IRIS what widget you want, and it creates a transparent, always-on-top, draggable mini-window.

**Example:**
```
"Create a widget showing current time and weather"
→ A small floating widget appears on your desktop
→ Shows live time and weather
→ Drag it anywhere, double-click to close
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 9: 🔒 SECURITY
# ═══════════════════════════════════════════════════════════════

## 9.1 Security Vault

**What it does:**
Protects your IRIS settings and API keys with:
- **PIN Lock** — 4-digit PIN (bcrypt hashed)
- **Face Recognition** — Store face descriptors for biometric unlock
- **Encrypted Storage** — API keys stored with Electron's `safeStorage`

## 9.2 Lock System

**What it does:**
- **Tactical Lockdown** — Reloads IRIS instantly (wipes current state)
- **OS Screen Lock** — Locks your Linux/Windows/macOS screen

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 10: 🎨 UI & THEMES
# ═══════════════════════════════════════════════════════════════

## 10.1 Light / Dark Mode

**What it does:**
Full theme system with light and dark modes. All widgets, cards, and components respect the theme. No hardcoded colors.

**How to switch:**
- Settings → GENERAL → Theme toggle
- Or via Command Palette: Ctrl+Shift+P → "Toggle Theme"

## 10.2 3D Sphere Interface

**What it does:**
IRIS's main visual is an animated 3D sphere that responds to audio and interaction. The sphere pulses when IRIS is speaking, glows when listening, and has particle effects.

## 10.3 Overlay Mode (Mini IRIS)

**What it does:**
Shrinks IRIS into a tiny 340x70 pixel bar at the bottom of your screen. Always on top. Perfect for when you want IRIS accessible but not taking up screen space.

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 11: 📊 DASHBOARD WIDGETS
# ═══════════════════════════════════════════════════════════════

**11 Widgets in the Right Sidebar:**

| Widget | What It Shows |
|--------|-------------|
| 🌤️ **Weather Widget** | Current weather, temperature, conditions |
| 📊 **Stock Widget** | Real-time stock prices, comparison charts |
| 📧 **Email Widget** | Gmail inbox preview, quick actions |
| 🖼️ **Image Generator** | AI image generation (FLUX model via HuggingFace) |
| 💻 **Live Coding** | Live code generation with streaming |
| 🗺️ **Map View** | Google Maps integration, directions |
| 🔍 **RAG Oracle** | Ask questions about your indexed codebase |
| 🔎 **Semantic Search** | Vector-based file search across your drives |
| 🎯 **Smart Zone** | Quick actions and drop zones |
| 🕳️ **Wormhole** | Tunnel management |
| 🔬 **Deep Research** | Web research with AI synthesis |

**6 Special Widgets:**

| Widget | What It Shows |
|--------|-------------|
| 🤖 **Agent Widget** | Live agent progress, cancel, results |
| 📊 **Coding Analytics** | Session stats, productivity score, streaks |
| ❌ **Error Companion** | Live error list, fix suggestions, patterns |
| 📋 **Task Widget** | Tasks and reminders with localStorage |
| 🧠 **Consciousness Widget** | Telegram ↔ Desktop sync status |
| 🏥 **Model Health Card** | AI model health with install commands |

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 12: 🎧 AUDIO & BLUETOOTH
# ═══════════════════════════════════════════════════════════════

## 12.1 Bluetooth Headphone Routing

**What it does:**
When you have Bluetooth headphones connected:
- **Mic input → IRIS** — Your BT microphone feeds into IRIS voice
- **AI voice output → Speakers** — IRIS speaks through speakers (not your headphones)
- **YouTube/Music → Speakers** — Music stays on speakers
- No audio echo (mic doesn't feed back through speakers)

## 12.2 Audio Processing Pipeline

```
Your Mic (16kHz) → AudioWorklet → Base64 PCM → Gemini WebSocket
                                                    ↓
Gemini Response Audio → Base64 Decode → AudioContext → Speakers
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 13: 📦 OTHER SERVICES
# ═══════════════════════════════════════════════════════════════

## 13.1 RAG Oracle (Codebase Q&A)

**What it does:**
Index your entire project folder. Then ask questions about your code in natural language. Uses vector embeddings for semantic search.

**Example:**
```
"Index my ~/projects/myapp folder"
→ Scans all files, creates embeddings, stores in vector DB

"How does the authentication middleware work in my app?"
→ Searches your indexed codebase semantically
→ Finds relevant files and code sections
→ "Your auth middleware is in src/middleware/auth.ts.
    It validates JWT tokens and checks for expired sessions..."
```

## 13.2 Deep Research

**What it does:**
Full web research on any topic. Uses Tavily search engine to find sources, then Groq AI to synthesize a comprehensive report.

**Example:**
```
"Research: Best practices for React Server Components 2026"
→ Searches 5+ sources on the web
→ Synthesizes into a detailed markdown report
→ "Here's what I found: [comprehensive report with sources]"
```

## 13.3 Workflow Editor

**What it does:**
Visual workflow builder. Create multi-step automation flows by connecting nodes. Save and reuse workflows.

## 13.4 Notes Manager

**What it does:**
Create, save, and manage notes. Persisted locally. Searchable.

## 13.5 Gallery Manager

**What it does:**
Browse your photos, analyze them with AI vision, OCR text extraction.

## 13.6 Macro Executor

**What it does:**
Record and replay sequences of actions. Create keyboard/mouse macros for repetitive tasks.

## 13.7 Mobile Control (ADB)

**What it does:**
Control your Android phone from IRIS. Tap, swipe, type, open apps, pull/push files — all via ADB.

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 14: ⚙️ TECHNICAL SPECS
# ═══════════════════════════════════════════════════════════════

| Metric | Value |
|--------|-------|
| Total files | 135 |
| Total lines of code | 27,498 |
| Registered modules | 51 |
| TypeScript errors | 0 |
| Build status | ✅ PASSING |
| Framework | Electron + React + Vite |
| AI Models | Gemini, Groq, HuggingFace, Ollama |
| Voice | Gemini WebSocket (real-time duplex) |
| Memory Storage | Local JSON files (userData/Brain/) |
| Vector DB | LanceDB (for semantic search) |
| Embeddings | Xenova/all-MiniLM-L6-v2 |
| Theme | Light + Dark (CSS variables) |
| Platforms | Linux, Windows, macOS |
| Telegram Bot | 100+ commands |
| Audio | 16kHz mic → Gemini → speakers |
| Security | PIN + Face + safeStorage encryption |

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 15: 🗂️ FILE MAP — Where Everything Lives
# ═══════════════════════════════════════════════════════════════

```
IRIS-AI/
├── src/
│   ├── main/                          ← Backend (Node.js / Electron)
│   │   ├── index.ts                   ← 51 modules registered, main entry
│   │   ├── ai/
│   │   │   └── model-router.ts        ← 4-model fallback chain
│   │   ├── brain/
│   │   │   ├── episodic-memory.ts     ← "What happened" memory
│   │   │   ├── semantic-memory.ts     ← "What I know" memory
│   │   │   ├── procedural-memory.ts   ← "What to do and when" memory
│   │   │   ├── brain-router.ts        ← Routes queries to right memory
│   │   │   └── shared-consciousness.ts ← Telegram ↔ Desktop sync
│   │   ├── soul/
│   │   │   ├── personality-engine.ts  ← 4 personality modes
│   │   │   ├── emotion-engine.ts      ← 8 emotional states
│   │   │   ├── ambient-presence.ts    ← 3 ambient modes
│   │   │   ├── notice-engine.ts       ← Silent behavior observer
│   │   │   ├── suggestion-engine.ts   ← Proactive suggestions
│   │   │   ├── pair-programmer.ts     ← File watcher + suggestions
│   │   │   └── session-ritual.ts      ← Start/end of day rituals
│   │   ├── agents/
│   │   │   └── orchestrator.ts        ← 8 agent types, auto-spawn
│   │   ├── coding/
│   │   │   ├── error-companion.ts     ← 17 error patterns, auto-fix
│   │   │   ├── coding-analytics.ts    ← Session tracking, scores
│   │   │   └── command-palette.ts     ← 24 commands, fuzzy search
│   │   ├── soul/                      ← Already listed above
│   │   ├── logic/
│   │   │   ├── terminal-control.ts    ← Terminal with error parsing
│   │   │   ├── ghost-control.ts       ← Mouse + keyboard control
│   │   │   ├── telekinesis.ts         ← Window management
│   │   │   ├── reality-hacker.ts      ← Website theme hacking
│   │   │   ├── file-read.ts           ← Read file contents
│   │   │   ├── file-write.ts          ← Create/write files
│   │   │   ├── file-ops.ts            ← Copy, move, delete
│   │   │   ├── file-open.ts           ← Open with default app
│   │   │   ├── file-search.ts         ← Semantic file search
│   │   │   ├── file-launcher.ts       ← File scanner
│   │   │   ├── dir-load.ts            ← Directory browser
│   │   │   ├── app-launcher.ts        ← App launch/kill
│   │   │   ├── web-agent.ts           ← Web browsing agent
│   │   │   ├── gmail-manager.ts       ← Gmail integration
│   │   │   ├── adb-manager.ts         ← Android phone control
│   │   │   ├── notes-manager.ts       ← Notes CRUD
│   │   │   ├── gallery-manager.ts     ← Photo gallery + AI vision
│   │   │   ├── live-location.ts       ← Location tracking
│   │   │   ├── iris-memory-save.ts    ← Memory persistence
│   │   │   ├── permanent-memory.ts    ← Core memory system
│   │   │   └── get-system-info.ts     ← System stats
│   │   ├── services/
│   │   │   ├── deep-research.ts       ← Web research (Tavily + Groq)
│   │   │   ├── RAG-oracle.ts          ← Codebase Q&A (vector DB)
│   │   │   ├── wormhole.ts            ← Public tunnel (Cloudflare)
│   │   │   └── iris-coder.ts          ← Live code generation
│   │   ├── auto/
│   │   │   ├── website-builder.ts     ← AI website generator
│   │   │   └── widget-manager.ts      ← Floating widget creator
│   │   ├── handlers/
│   │   │   ├── ScreenPeeler-handler.ts  ← Screen OCR tool
│   │   │   ├── PhantomControl-handler.ts ← Floating keyboard
│   │   │   └── SmartDropZone-Handler.ts  ← Human-like drag/drop
│   │   ├── security/
│   │   │   ├── Security.ts            ← PIN + Face + Vault
│   │   │   └── lock-system.ts         ← OS screen lock
│   │   ├── telegram/
│   │   │   └── telegram-bot.ts        ← 100+ commands (1,894 lines)
│   │   └── workflow/
│   │       └── workflow-manager.ts    ← Visual workflow builder
│   │
│   ├── renderer/                      ← Frontend (React + TypeScript)
│   │   ├── index.html                 ← Splash screen, anti-flash
│   │   └── src/
│   │       ├── main.tsx               ← React entry, LOCAL_MODE=true
│   │       ├── IndexRoot.tsx          ← Root layout + watchdog
│   │       ├── views/
│   │       │   ├── Dashboard.tsx      ← Main dashboard with widgets
│   │       │   ├── Settings.tsx       ← GENERAL + MODELS tabs
│   │       │   ├── Gallery.tsx        ← Photo gallery
│   │       │   ├── Notes.tsx          ← Notes editor
│   │       │   ├── Phone.tsx          ← Phone control panel
│   │       │   ├── WorkFlowEditor.tsx ← Visual workflow builder
│   │       │   └── APP.tsx            ← App shell
│   │       ├── components/
│   │       │   ├── Sphere.tsx         ← 3D animated sphere
│   │       │   ├── CommandPalette.tsx  ← Ctrl+Shift+P overlay
│   │       │   ├── AgentWidget.tsx     ← Agent progress display
│   │       │   ├── CodingAnalyticsWidget.tsx ← Session stats
│   │       │   ├── ErrorCompanionWidget.tsx   ← Error list + fixes
│   │       │   ├── TaskWidget.tsx     ← Tasks & reminders
│   │       │   ├── ConsciousnessWidget.tsx    ← Sync status
│   │       │   ├── ModelHealthCard.tsx ← Model health display
│   │       │   ├── Titlebar.tsx       ← Custom window titlebar
│   │       │   ├── MiniOverlay.tsx    ← Overlay mode UI
│   │       │   ├── TerminalOverlay.tsx ← Terminal overlay
│   │       │   ├── MacroManagementMenu.tsx ← Macro editor
│   │       │   ├── ParameterEditorDrawer.tsx ← Param editor
│   │       │   ├── ToolNode.tsx       ← Workflow tool node
│   │       │   └── ViewSkelrton.tsx   ← View skeleton loader
│   │       ├── Widgets/
│   │       │   ├── WeatherWidget.tsx
│   │       │   ├── StockWidget.tsx
│   │       │   ├── EmailWidget.tsx
│   │       │   ├── ImageWidget.tsx
│   │       │   ├── LiveCodingWidget.tsx
│   │       │   ├── MapView.tsx
│   │       │   ├── RagOrcaleWidget.tsx
│   │       │   ├── SematicSearch.tsx
│   │       │   ├── SmartZoneWidget.tsx
│   │       │   ├── WormholeWidget.tsx
│   │       │   └── DeepResearch.tsx
│   │       ├── services/
│   │       │   ├── Iris-voice-ai.ts   ← Voice engine (Gemini WS)
│   │       │   ├── iris-ai-brain.ts   ← Brain API client
│   │       │   ├── get-apps.ts        ← Running apps lister
│   │       │   └── system-info.ts     ← System stats client
│   │       ├── store/
│   │       │   ├── theme-store.ts     ← Dark/Light theme
│   │       │   └── auth-store.ts      ← Auth state
│   │       ├── assets/
│   │       │   └── main.css           ← 29 theme rules, CSS variables
│   │       ├── UI/
│   │       │   └── IRIS.tsx           ← Main UI + 3D sphere
│   │       ├── tools/                 ← API wrapper functions
│   │       ├── functions/             ← Feature API wrappers
│   │       ├── code/                  ← Macro executor, website builder
│   │       └── config/                ← Axios, API configs
│   │
│   └── preload/
│       └── index.js                   ← Electron bridge (IPC)
│
├── out/                               ← Build output
├── resources/                         ← App icons
├── package.json                       ← Dependencies & scripts
├── electron.vite.config.ts           ← Build config
├── tsconfig.json                      ← TypeScript config
├── JARVIS-ROADMAP.md                  ← Full development roadmap
├── FEATURES_AND_APIS.md               ← Feature & API reference
├── QUICKSTART.md                      ← Quick start guide
└── IRIS-COMPLETE-GUIDE.md             ← THIS FILE
```

---

# ═══════════════════════════════════════════════════════════════
#  SECTION 16: 🚀 QUICK START
# ═══════════════════════════════════════════════════════════════

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run in development
npm run dev

# 3. Build for production
npm run build

# 4. Type check
npx tsc --noEmit
```

**Required API Keys (in Settings → Vault):**
| Key | Free? | Used For |
|-----|-------|---------|
| Google Gemini | Yes (free tier) | Voice AI, code gen, website builder |
| Groq | Yes (free tier) | Semantic search, fast chat, deep research |
| Tavily | Yes (free tier) | Deep research web search |
| HuggingFace | Yes (free tier) | Image generation |

**Optional:**
| Key | Used For |
|-----|---------|
| Telegram Bot Token | Remote control from phone |
| Google OAuth | Login system |
| Ollama (local) | Offline AI — `ollama pull qwen3:4b` |

---

# ═══════════════════════════════════════════════════════════════
#  🛸 "Sir, I'm here. Always." — IRIS AI
# ═══════════════════════════════════════════════════════════════
