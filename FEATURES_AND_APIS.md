# ╔══════════════════════════════════════════════════════════════════╗
# ║                🛸 IRIS AI — COMPLETE FEATURE & API LIST        ║
# ╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔑 REQUIRED API KEYS (Stored in Command Center Vault)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  #  │ KEY NAME              │ USED FOR
  ────┼────────────────────────┼─────────────────────────────────────
  1  │ Google Gemini API Key  │ Brain (Voice AI), RAG Oracle,
     │                        │ Live Coding, Website Builder,
     │                        │ Screen Peeler, Phantom Keyboard
  ────┼────────────────────────┼─────────────────────────────────────
  2  │ Groq API Key           │ Semantic Search, Deep Research,
     │                        │ RAG Oracle Q&A, File Search
  ────┼────────────────────────┼─────────────────────────────────────
  3  │ Tavily API Key         │ Deep Research (web search engine)
  ────┼────────────────────────┼─────────────────────────────────────
  4  │ Hugging Face API Key   │ Image Generation (FLUX model)
  ────┼────────────────────────┼─────────────────────────────────────
  5  │ Google OAuth (Backend)  │ Login/Auth System
     │ VITE_BACKEND_KEY        │


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧠 CORE AI ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 1. IRIS Voice AI Brain                                         │
  │    File: src/renderer/src/services/Iris-voice-ai.ts             │
  │    API: Google Gemini (WebSocket Real-time)                     │
  │         wss://generativelanguage.googleapis.com/...             │
  │    Model: gemini-2.5-flash-native-audio-preview-12-2025        │
  │    Voices: Puck (Male) / Aoede (Female)                        │
  │    Features:                                                    │
  │      • Real-time voice conversation (WebSocket streaming)       │
  │      • Speech-to-Text (Google native audio input)               │
  │      • Text-to-Speech (Google native audio output)              │
  │      • 50+ function calling capabilities                        │
  │      • Conversation history (last 20 messages stored)           │
  │      • Core memory system (permanent facts about user)          │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🗂️ FILE SYSTEM MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 2. Directory Reader                                            │
  │    File: src/main/logic/dir-load.ts                             │
  │    API: None (Local OS)                                         │
  │    Features: Browse folders, detect file types, show sizes,     │
  │              supports Desktop/Downloads/Documents shortcuts      │
  ├─────────────────────────────────────────────────────────────────┤
  │ 3. File Read                                                   │
  │    File: src/main/logic/file-read.ts                            │
  │    API: None (Local OS)                                         │
  │    Features: Read file content (up to 2000 chars)               │
  ├─────────────────────────────────────────────────────────────────┤
  │ 4. File Write                                                  │
  │    File: src/main/logic/file-write.ts                           │
  │    API: None (Local OS)                                         │
  │    Features: Create/write files to disk                         │
  ├─────────────────────────────────────────────────────────────────┤
  │ 5. File Operations (Copy/Move/Delete)                          │
  │    File: src/main/logic/file-ops.ts                             │
  │    API: None (Local OS)                                         │
  │    Features: Copy, move, delete files & directories              │
  ├─────────────────────────────────────────────────────────────────┤
  │ 6. File Open                                                   │
  │    File: src/main/logic/file-open.ts                            │
  │    API: None (Local OS - shell.openPath)                        │
  │    Features: Open file with default app, reveal in file manager │
  ├─────────────────────────────────────────────────────────────────┤
  │ 7. Semantic File Search                                        │
  │    File: src/main/logic/file-search.ts                          │
  │    APIs: Groq (llama-3.1-8b-instant) for keyword extraction    │
  │          @xenova/transformers (Xenova/all-MiniLM-L6-v2) for    │
  │          vector embeddings                                      │
  │          vectordb (LanceDB) for vector storage & similarity     │
  │    Features:                                                    │
  │      • Index folders into vector database                       │
  │      • AI-powered keyword extraction from natural language      │
  │      • Deep recursive file crawl across drives                  │
  │      • Semantic similarity search + native keyword search       │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🖥️ DESKTOP CONTROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 8. App Launcher / Killer                                       │
  │    File: src/main/logic/app-launcher.ts                         │
  │    API: None (OS commands)                                      │
  │    Linux: gtk-launch, .desktop files, pkill                     │
  │    Windows: PowerShell, taskkill, explorer                      │
  │    Features:                                                    │
  │      • Open 30+ apps by name (VS Code, Chrome, Spotify, etc.)  │
  │      • Close apps with protected process guard                  │
  │      • Smart desktop file search (Linux)                        │
  │      • Windows Start Menu integration                           │
  ├─────────────────────────────────────────────────────────────────┤
  │ 9. Ghost Control (Mouse & Keyboard)                            │
  │    File: src/main/logic/ghost-control.ts                        │
  │    APIs: @nut-tree-fork/nut-js (mouse/keyboard automation)     │
  │          screenshot-desktop (screen capture)                    │
  │          loudness (volume control)                              │
  │    Linux: pactl/amixer (volume), xclip (clipboard)             │
  │    Features:                                                    │
  │      • Click coordinates with human-like mouse paths            │
  │      • Keyboard typing, key pressing, shortcuts                 │
  │      • Ghost sequences (multi-step automation macros)           │
  │      • Screenshot capture                                       │
  │      • System volume control                                    │
  │      • Scroll up/down                                           │
  │      • File copy to clipboard                                   │
  ├─────────────────────────────────────────────────────────────────┤
  │ 10. Terminal Control                                           │
  │     File: src/main/logic/terminal-control.ts                    │
  │     API: None (OS shell)                                        │
  │     Linux: $SHELL (bash/zsh/fish)                               │
  │     Windows: PowerShell                                         │
  │     Features: Run shell commands, live output streaming         │
  ├─────────────────────────────────────────────────────────────────┤
  │ 11. Telekinesis (Window Manager)                               │
  │     File: src/main/logic/telekinesis.ts                         │
  │     API: node-window-manager                                    │
  │     Features:                                                   │
  │       • Move windows to left/right/halves/quarters              │
  │       • Maximize windows                                        │
  │       • Bring windows to front                                  │
  ├─────────────────────────────────────────────────────────────────┤
  │ 12. Running App Detection                                      │
  │     File: src/main/logic/file-launcher.ts                       │
  │     API: None (OS commands)                                     │
  │     Linux: wmctrl, ps                                           │
  │     Windows: PowerShell                                         │
  │     macOS: osascript                                            │
  │     Features: List all currently running GUI applications       │
  ├─────────────────────────────────────────────────────────────────┤
  │ 13. System Information                                         │
  │     File: src/main/logic/get-system-info.ts                     │
  │     API: Node.js os module                                      │
  │     Features:                                                   │
  │       • CPU usage % (real-time)                                 │
  │       • RAM usage (total/free/used %)                           │
  │       • System uptime                                           │
  │       • Drive storage info                                      │
  │       • Installed apps list                                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ 14. Phantom Keyboard (Floating AI)                             │
  │     File: src/main/handlers/PhantomControl-handler.ts           │
  │     API: Google Gemini (gemini-3-flash-preview)                 │
  │     Shortcut: Ctrl+Alt+Space                                    │
  │     Features:                                                   │
  │       • Floating overlay at cursor position                     │
  │       • Inline code/text generation with streaming              │
  │       • Auto-insert generated text                              │
  │       • Dismisses on blur/Escape                                │
  ├─────────────────────────────────────────────────────────────────┤
  │ 15. Screen Peeler (OCR + Code Extractor)                       │
  │     File: src/main/handlers/ScreenPeeler-handler.ts             │
  │     APIs: Google Gemini (gemini-2.5-flash-lite) for OCR        │
  │           Prism.js for syntax highlighting                      │
  │     Features:                                                   │
  │       • Capture screen region                                   │
  │       • AI-powered text/code extraction from screenshots        │
  │       • Language detection                                      │
  │       • Syntax highlighted output window                        │
  │       • Copy extracted code/image to clipboard                  │
  ├─────────────────────────────────────────────────────────────────┤
  │ 16. Smart Drop Zone                                            │
  │     File: src/main/handlers/SmartDropZone-Handler.ts            │
  │     API: @nut-tree-fork/nut-js (drag & drop)                   │
  │     Features:                                                   │
  │       • AI-powered drag and drop                                │
  │       • File categorization & moving                            │
  │       • Full-screen overlay UI for drop zones                   │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐 WEB & RESEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 17. Web Agent (Search & Browse)                                │
  │     File: src/main/logic/web-agent.ts                           │
  │     APIs: Puppeteer + Stealth Plugin (headless browser)        │
  │           Cheerio (HTML parsing)                                │
  │     Features:                                                   │
  │       • Google/DuckDuckGo search                                │
  │       • Smart URL routing (YouTube, Amazon, GitHub, etc.)      │
  │       • Web scraping & summarization                            │
  │       • Bookmarks (Instagram, Reddit, ChatGPT, etc.)           │
  ├─────────────────────────────────────────────────────────────────┤
  │ 18. Deep Research                                              │
  │     File: src/main/services/deep-research.ts                    │
  │     APIs: Tavily (advanced web search)                          │
  │           Groq (llama-3.1-8b-instant) for synthesis            │
  │     Features:                                                   │
  │       • Multi-source deep research                              │
  │       • AI-powered summary generation                           │
  │       • 5 source results with advanced search depth             │
  ├─────────────────────────────────────────────────────────────────┤
  │ 19. RAG Oracle (Codebase Intelligence)                         │
  │     File: src/main/services/RAG-oracle.ts                       │
  │     APIs: Google Gemini (gemini-embedding-001) for embeddings  │
  │           Groq (llama-3.1-8b-instant) for Q&A                  │
  │     Features:                                                   │
  │       • Ingest entire codebases into vector DB                  │
  │       • Resumable indexing (saves progress to disk)             │
  │       • Cosine similarity search                                │
  │       • AI-powered codebase Q&A with context                    │
  │       • Progress streaming during ingestion                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ 20. Website Builder (Live Forge)                               │
  │     File: src/main/auto/website-builder.ts                      │
  │     API: Google Gemini (gemini-3-flash-preview)                 │
  │     Features:                                                   │
  │       • Generate complete animated websites from prompts        │
  │       • Live preview with iframe streaming                      │
  │       • Tailwind CSS + GSAP + ScrollTrigger                     │
  │       • Auto-saves generated HTML files                         │
  │       • Premium UI/UX design rules built-in                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ 21. Reality Hacker (Website Theme Injection)                   │
  │     File: src/main/logic/reality-hacker.ts                      │
  │     API: None (Electron BrowserWindow + JS injection)           │
  │     Features:                                                   │
  │       • Emerald theme injection on any website                  │
  │       • DOM text rewriting (YouTube, Amazon, GitHub, etc.)     │
  │       • Logo hijacking                                          │
  │       • Button text hijacking                                   │
  │       • Watermark overlay                                       │
  │       • Site-specific attack patterns                           │
  ├─────────────────────────────────────────────────────────────────┤
  │ 22. Wormhole (Public URL Tunnel)                               │
  │     File: src/main/services/wormhole.ts                         │
  │     API: untun (Cloudflare Tunnel)                              │
  │     Features:                                                   │
  │       • Expose localhost port to public internet                │
  │       • Cloudflare-powered tunnel                               │
  │       • One-click open/close                                     │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📱 MOBILE DEVICE CONTROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 23. ADB Manager (Android Device Control)                       │
  │     File: src/main/logic/adb-manager.ts                         │
  │     API: Android Debug Bridge (ADB)                             │
  │     Features:                                                   │
  │       • Connect/disconnect via WiFi ADB                         │
  │       • Device connection history                               │
  │       • Screenshot capture from phone                           │
  │       • Quick actions: wake, lock, home, camera                 │
  │       • Full device telemetry (battery, storage, model, OS)     │
  │       • Open/close apps on phone                                │
  │       • Tap screen at coordinates                               │
  │       • Swipe (up/down/left/right)                              │
  │       • Push/pull files between PC and phone                    │
  │       • Notification reading                                    │
  │       • Hardware toggles (WiFi, Bluetooth, etc.)                │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📧 COMMUNICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 24. Gmail Integration                                          │
  │     File: src/main/logic/gmail-manager.ts                       │
  │     APIs: Google APIs (google.gmail v1)                        │
  │           @google-cloud/local-auth (OAuth2)                     │
  │     Features:                                                   │
  │       • Read latest emails                                       │
  │       • Send emails with subject & body                         │
  │       • Create email drafts                                     │
  │       • OAuth2 authentication with token caching                │
  ├─────────────────────────────────────────────────────────────────┤
  │ 25. WhatsApp Automation                                        │
  │     File: src/renderer/src/functions/whatsapp-manager-api.ts    │
  │     API: Ghost Control (keyboard automation)                    │
  │     Features:                                                   │
  │       • Send messages by contact name                           │
  │       • Send files via WhatsApp                                 │
  │       • Schedule messages                                       │
  ├─────────────────────────────────────────────────────────────────┤
  │ 26. Spotify Control                                            │
  │     File: src/renderer/src/functions/Sporify-manager.ts         │
  │     API: Ghost Control (keyboard automation)                    │
  │     Features: Play any song by name via Spotify desktop app     │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎨 MEDIA & VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 27. Image Generation                                           │
  │     File: src/renderer/src/tools/Image-generator.ts             │
  │     APIs: Hugging Face Inference API                            │
  │           Model: black-forest-labs/FLUX.1-schnell               │
  │     Features:                                                   │
  │       • Text-to-image generation                                │
  │       • Live preview with loading animation                     │
  │       • Auto-save to Gallery                                    │
  ├─────────────────────────────────────────────────────────────────┤
  │ 28. Gallery Manager                                            │
  │     File: src/main/logic/gallery-manager.ts                     │
  │     API: None (Local filesystem)                                │
  │     Features:                                                   │
  │       • Save generated images                                   │
  │       • Browse gallery (sorted by date)                         │
  │       • Delete images                                           │
  │       • Open in file manager                                    │
  │       • Save/export copies                                      │
  ├─────────────────────────────────────────────────────────────────┤
  │ 29. Live Location                                              │
  │     File: src/main/logic/live-location.ts                       │
  │     APIs: GeoClue2 (Linux GPS)                                  │
  │           BigDataCloud (reverse geocoding)                      │
  │           IP-based geolocation (fallback)                        │
  │     Features: Get GPS coordinates + city/country/region         │
  ├─────────────────────────────────────────────────────────────────┤
  │ 30. Map View                                                   │
  │     File: src/renderer/src/tools/Earth-View.ts                  │
  │     APIs: OpenStreetMap Nominatim (geocoding)                   │
  │           Leaflet + React-Leaflet (map rendering)               │
  │           OSRM (routing/navigation)                             │
  │     Features:                                                   │
  │       • Interactive dark-mode map                               │
  │       • Location search                                         │
  │       • Navigation/directions between two points                │
  ├─────────────────────────────────────────────────────────────────┤
  │ 31. Weather Widget                                             │
  │     File: src/renderer/src/tools/weather-api.ts                 │
  │     APIs: Open-Meteo Geocoding API                              │
  │           Open-Meteo Forecast API                                │
  │     Features:                                                   │
  │       • Real-time weather by city                               │
  │       • Temperature, humidity, wind speed                       │
  │       • Condition detection (rain/snow/thunder/haze)            │
  │       • Widget popup display                                    │
  ├─────────────────────────────────────────────────────────────────┤
  │ 32. Stock Market Widget                                        │
  │     File: src/renderer/src/tools/stock-api.ts                   │
  │     API: Yahoo Finance API (v8 chart endpoint)                  │
  │     Features:                                                   │
  │       • Real-time stock price                                   │
  │       • Intraday chart (5-min intervals)                        │
  │       • Compare two stocks side by side                         │
  │       • Supports Indian (.NS) & US tickers                      │
  │       • Percentage change calculation                           │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💻 CODING & DEVELOPMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 33. IRIS Coder (Live Code Generation)                          │
  │     File: src/main/services/iris-coder.ts                       │
  │     API: Google Gemini (gemini-3-flash-preview)                 │
  │     Features:                                                   │
  │       • Stream code in real-time to file                        │
  │       • Monaco Editor integration                               │
  │       • Auto-open in VS Code                                    │
  │       • Project workspace management                            │
  ├─────────────────────────────────────────────────────────────────┤
  │ 34. Macro Executor                                             │
  │     File: src/renderer/src/code/macro-executor.ts               │
  │     API: Ghost Control (IPC)                                    │
  │     Features:                                                   │
  │       • Execute multi-step automation macros                    │
  │       • Conditional step execution                              │
  │       • Macro management UI                                     │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📝 NOTES & MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 35. Notes Manager                                              │
  │     File: src/main/logic/notes-manager.ts                       │
  │     API: None (Local filesystem - Markdown)                     │
  │     Features:                                                   │
  │       • Create/save notes as .md files                          │
  │       • List all notes (sorted by date)                         │
  │       • Delete notes                                            │
  ├─────────────────────────────────────────────────────────────────┤
  │ 36. IRIS Memory (Chat History)                                 │
  │     File: src/main/logic/iris-memory-save.ts                    │
  │     API: None (Local JSON file)                                 │
  │     Features:                                                   │
  │       • Save conversation messages                              │
  │       • Load chat history (last 20 messages)                    │
  │       • Persistent across restarts                              │
  ├─────────────────────────────────────────────────────────────────┤
  │ 37. Permanent Memory Bank                                      │
  │     File: src/main/logic/permanent-memory.ts                    │
  │     API: None (Local JSON file)                                 │
  │     Features:                                                   │
  │       • Store permanent facts about user                        │
  │       • Search/retrieve all memories                            │
  │       • Timestamped entries                                     │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔐 SECURITY & AUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 38. Security Vault                                             │
  │     File: src/main/security/Security.ts                         │
  │     APIs: electron-store (encrypted storage)                    │
  │           bcryptjs (PIN hashing)                                │
  │           Electron safeStorage (API key encryption)             │
  │           face-api.js (face recognition)                        │
  │     Features:                                                   │
  │       • PIN lock/unlock                                         │
  │       • Face recognition unlock (128-dim descriptor)            │
  │       • Multiple face profiles                                  │
  │       • Encrypted API key storage                               │
  │       • Custom AI personality setting                           │
  ├─────────────────────────────────────────────────────────────────┤
  │ 39. Lock System                                                │
  │     File: src/main/security/lock-system.ts                      │
  │     API: None (OS commands)                                     │
  │     Linux: gnome-screensaver-command / loginctl                 │
  │     Windows: rundll32 LockWorkStation                           │
  │     macOS: pmset displaysleepnow                                │
  │     Features:                                                   │
  │       • Lock OS screen                                          │
  │       • Tactical lockdown (reload IRIS)                         │
  ├─────────────────────────────────────────────────────────────────┤
  │ 40. Auth System (Login/Google OAuth)                           │
  │     Files: src/renderer/src/auth/Login.tsx                      │
  │            src/renderer/src/auth/AuthToken.tsx                   │
  │            src/renderer/src/store/auth-store.ts                  │
  │     API: External Backend (VITE_BACKEND_KEY)                    │
  │           Google OAuth2                                         │
  │     Features:                                                   │
  │       • Google Sign-In                                          │
  │       • Access token management (Zustand store)                 │
  │       • Auth middleware protection                              │
  │       • Boot sequence animation                                 │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧩 WIDGETS & UI COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 41. Dynamic Widget Creator                                     │
  │     File: src/main/auto/widget-manager.ts                       │
  │     API: None (Electron BrowserWindow)                          │
  │     Features:                                                   │
  │       • Spawn floating desktop widgets from HTML                │
  │       • Always-on-top, transparent, frameless                   │
  │       • Draggable with no-drag exclusion for inputs             │
  │       • Double-click to close                                   │
  │       • Bulk close all widgets                                  │
  ├─────────────────────────────────────────────────────────────────┤
  │ 42. Workflow Editor                                            │
  │     File: src/main/workflow/workflow-manager.ts                 │
  │     API: None (Local JSON) + ReactFlow                          │
  │     Features:                                                   │
  │       • Visual node-based workflow editor                       │
  │       • Save/load/delete workflows                              │
  │       • Drag-and-drop node connections                          │
  ├─────────────────────────────────────────────────────────────────┤
  │ 43. Overlay Mode                                               │
  │     File: src/main/index.ts                                     │
  │     API: None (Electron BrowserWindow)                          │
  │     Shortcut: Ctrl+Shift+I                                      │
  │     Features:                                                   │
  │       • Toggle between full-screen and mini overlay             │
  │       • Always-on-top mini bar (340x70)                         │
  │       • Centered at bottom of screen                            │
  ├─────────────────────────────────────────────────────────────────┤
  │ 44. Mini Overlay UI                                            │
  │     File: src/renderer/src/components/MiniOverlay.tsx           │
  │     API: None (React Component)                                 │
  │     Features: Compact voice control overlay                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ 45. 3D Sphere Visualization                                    │
  │     File: src/renderer/src/components/Sphere.tsx                │
  │     APIs: Three.js + React Three Fiber + Drei                  │
  │     Features: Interactive 3D sphere animation (visual flair)    │
  ├─────────────────────────────────────────────────────────────────┤
  │ 46. Lock Screen                                                │
  │     File: src/renderer/src/UI/LockScreen.tsx                    │
  │     APIs: face-api.js (face detection models)                   │
  │           webcam (camera access)                                 │
  │     Models: ssd_mobilenetv1, face_landmark_68,                 │
  │             face_recognition, age_gender, face_expression       │
  │     Features:                                                   │
  │       • PIN entry lock screen                                   │
  │       • Face recognition unlock                                 │
  │       • Camera preview                                          │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 VIEWS / PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────────────────────────────────┐
  │ 47. Dashboard View         — Main IRIS interface               │
  │ 48. Settings View          — API keys, personality, vault       │
  │ 49. Gallery View           — Generated images browser           │
  │ 50. Notes View             — Markdown notes manager             │
  │ 51. Phone View             — Android device control panel       │
  │ 52. Apps View              — Installed apps grid                │
  │ 53. WorkFlow Editor View   — Visual workflow builder            │
  └─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📡 COMPLETE API REFERENCE TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  #  │ API / SERVICE                │ TYPE          │ USED IN FEATURES
  ────┼──────────────────────────────┼───────────────┼───────────────────
  1  │ Google Gemini API            │ LLM + STT/TTS │ Brain, Phantom,
     │                              │               │ Coder, Website,
     │                              │               │ Screen Peeler,
     │                              │               │ RAG Oracle
  2  │ Groq API                     │ LLM           │ Semantic Search,
     │ (llama-3.1-8b-instant)       │               │ Deep Research,
     │                              │               │ RAG Oracle Q&A
  3  │ Tavily API                   │ Search Engine │ Deep Research
  4  │ Hugging Face Inference       │ Image Gen     │ Image Generator
     │ (FLUX.1-schnell)             │               │
  5  │ Yahoo Finance API            │ Financial     │ Stock Widget
  6  │ Open-Meteo API               │ Weather       │ Weather Widget
  7  │ OpenStreetMap Nominatim      │ Geocoding     │ Map View
  8  │ OSRM API                     │ Routing       │ Navigation
  9  │ BigDataCloud API             │ Geolocation   │ Live Location
  10 │ Google OAuth2                │ Auth          │ Login System
  11 │ Google Gmail API v1          │ Email         │ Gmail Manager
  12 │ Google Cloud Local Auth      │ Auth          │ Gmail OAuth
  13 │ Android ADB                  │ Device Ctrl   │ Phone Control
  14 │ Cloudflare Tunnel (untun)    │ Tunneling     │ Wormhole
  15 │ Xenova Transformers          │ Embeddings    │ Semantic Search
     │ (all-MiniLM-L6-v2)           │ (local)       │
  16 │ LanceDB (vectordb)           │ Vector DB     │ Semantic Search
  17 │ face-api.js                  │ Face Recog    │ Lock Screen,
     │ (TensorFlow.js models)       │               │ Security Vault
  18 │ Puppeteer + Stealth          │ Web Scraping  │ Web Agent
  19 │ Cheerio                      │ HTML Parsing  │ Web Agent
  20 │ nut.js (nut-tree-fork)       │ Desktop Ctrl  │ Ghost Control,
     │                              │               │ Drop Zone
  21 │ screenshot-desktop           │ Screen Capture│ Screenshots
  22 │ Prism.js                     │ Syntax Highlight│ Screen Peeler
  23 │ Three.js / R3F / Drei       │ 3D Rendering  │ Sphere Component
  24 │ Leaflet / React-Leaflet      │ Maps          │ Map View
  25 │ Electron SafeStorage         │ Encryption    │ API Key Vault
  26 │ bcryptjs                     │ Hashing       │ PIN Vault
  27 │ loudness                     │ Volume Ctrl   │ System Volume
  28 │ node-window-manager          │ Window Mgmt   │ Telekinesis
  29 │ xclip / xdotool / wmctrl     │ Linux Desktop │ Ghost, Apps,
     │ (Linux system packages)      │               │ Terminal, Lock


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📦 BUILD TARGETS (Linux)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Target      │ Format       │ Arch
  ────────────┼──────────────┼───────────
  AppImage    │ .AppImage    │ x64, arm64
  Debian      │ .deb         │ x64, arm64
  RPM         │ .rpm         │ x64
  Snap        │ .snap        │ auto
  Tarball     │ .tar.gz      │ x64


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏗️ TECH STACK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Layer         │ Technology
  ──────────────┼─────────────────────────────────────
  Framework     │ Electron 42 + electron-vite 5
  Frontend      │ React 19 + TypeScript 6
  Styling       │ Tailwind CSS 4 + Framer Motion
  State Mgmt    │ Zustand 5 + Immer
  AI/ML         │ Gemini, Groq, HuggingFace, Xenova
  Database      │ LanceDB (vector), JSON (local)
  Maps          │ Leaflet + OpenStreetMap
  3D            │ Three.js + React Three Fiber
  Build         │ electron-builder 26
  Desktop Ctrl  │ nut.js, xclip, wmctrl, xdotool
