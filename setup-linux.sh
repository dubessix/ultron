#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🐧 IRIS AI — Ubuntu/Debian Linux Setup Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Run:  chmod +x setup-linux.sh && ./setup-linux.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║          🛸 IRIS AI — Linux Setup                 ║"
echo "  ║     Preparing your Ubuntu system for IRIS...      ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""

# ─── 1. System Dependencies ───
echo "📦 [1/5] Installing system dependencies..."

sudo apt-get update

sudo apt-get install -y \
  libnotify4 \
  libxtst6 \
  libnss3 \
  libxss1 \
  libasound2 \
  libgbm1 \
  libgtk-3-0 \
  libdrm2 \
  libxkbcommon0 \
  libwayland-client0 \
  libwayland-server0 \
  wmctrl \
  xclip \
  xdotool \
  xvfb \
  dbus \
  curl \
  git \
  build-essential \
  python3 \
  libx11-dev \
  libxext-dev \
  libxrandr-dev \
  libxcomposite-dev \
  libxdamage-dev \
  libxfixes-dev \
  libxcursor-dev \
  libxi-dev \
  libxtst-dev \
  libpango1.0-dev \
  libcairo2-dev \
  libatk1.0-dev \
  libatspi2.0-dev \
  libcups2-dev

echo "✅ System dependencies installed."

# ─── 2. Node.js ───
echo ""
echo "📦 [2/5] Checking Node.js..."

if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo "   ✅ Node.js ${NODE_VERSION} detected."
else
  echo "   ⚠️  Node.js not found. Installing via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source "$HOME/.nvm/nvm.sh"
  nvm install --lts
  echo "   ✅ Node.js $(node -v) installed."
fi

# ─── 3. npm install ───
echo ""
echo "📦 [3/5] Installing npm dependencies (this may take a few minutes)..."

# Go to the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

npm install

echo "✅ npm dependencies installed."

# ─── 4. PulseAudio/PipeWire Volume Check ───
echo ""
echo "🔊 [4/5] Checking audio system..."

if command -v pactl &> /dev/null; then
  echo "   ✅ PulseAudio/PipeWire detected."
elif command -v amixer &> /dev/null; then
  echo "   ✅ ALSA detected."
else
  echo "   ⚠️  No audio system detected. Volume control may not work."
fi

# ─── 5. Permissions ───
echo ""
echo "🔐 [5/5] Setting up permissions..."

# Ensure the user is in the video group for camera access
sudo usermod -aG video "$USER" 2>/dev/null || true
# Audio group for microphone
sudo usermod -aG audio "$USER" 2>/dev/null || true

echo "✅ Permissions configured."

# ─── Done! ───
echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║             ✅ SETUP COMPLETE!                    ║"
echo "  ╠═══════════════════════════════════════════════════╣"
echo "  ║                                                   ║"
echo "  ║  🚀 To run in dev mode:                          ║"
echo "  ║     npm run dev                                   ║"
echo "  ║                                                   ║"
echo "  ║  📦 To build for Linux:                           ║"
echo "  ║     npm run build:linux                           ║"
echo "  ║                                                   ║"
echo "  ║  📦 Or just unpack (faster):                      ║"
echo "  ║     npm run build:unpack                          ║"
echo "  ║                                                   ║"
echo "  ║  ⚠️  NOTE: Log out & log back in for group       ║"
echo "  ║     permissions (video/audio) to take effect.     ║"
echo "  ║                                                   ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""
