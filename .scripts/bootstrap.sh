#!/bin/bash
# Bootstrap ritsu-works for new local environment
# Run after `git clone`
set -e

echo "🚀 Bootstrapping ritsu-works..."
echo ""

# Verify prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required (https://nodejs.org)"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required: npm install -g pnpm"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git required"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "⚠️  Supabase CLI recommended: npm install -g supabase"; }

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "20" ]; then
  echo "❌ Node.js >= 20 required (you have $NODE_VERSION)"
  exit 1
fi

echo "✓ Prerequisites OK"
echo ""

# Create runtime/ structure
echo "📁 Creating runtime/ folders..."
mkdir -p runtime/workspaces/founder/{wiki-cache,voice-notes-buffer,ingestion-tmp}
mkdir -p runtime/secrets
mkdir -p runtime/logs
mkdir -p runtime/tmp
mkdir -p runtime/exports
mkdir -p runtime/caches/{llm-responses,embeddings}
echo "✓ runtime/ structure created"
echo ""

# Setup .env if missing
if [ ! -f runtime/secrets/.env.local ]; then
  echo "⚙️  Creating runtime/secrets/.env.local from template..."
  cp .env.example runtime/secrets/.env.local
  ln -sf runtime/secrets/.env.local .env.local
  echo "✓ Created runtime/secrets/.env.local"
  echo "  ⚠️  EDIT runtime/secrets/.env.local with your credentials before continuing!"
else
  echo "✓ runtime/secrets/.env.local already exists"
fi
echo ""

# Install dependencies
if [ -f package.json ]; then
  echo "📦 Installing dependencies..."
  pnpm install
  echo "✓ Dependencies installed"
  echo ""
fi

# Setup git hooks (Husky)
if [ -d .husky ]; then
  echo "🪝 Setting up git hooks..."
  if [ -f package.json ] && grep -q '"husky"' package.json; then
    pnpm husky install 2>/dev/null || pnpm dlx husky install
  fi
  chmod +x .husky/* 2>/dev/null || true
  echo "✓ Git hooks installed"
  echo ""
fi

# Validate Tier 1 YAML files (if validator exists)
if [ -f package.json ] && grep -q '"validate-tier1"' package.json; then
  echo "✅ Validating Tier 1 YAML files..."
  pnpm validate-tier1 || echo "  ⚠️  Some Tier 1 files may need fixing"
  echo ""
fi

# Final summary
echo "════════════════════════════════════════════════════════"
echo "✅ Bootstrap complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit runtime/secrets/.env.local with your credentials"
echo "     (Supabase URL/keys, Anthropic API key, etc.)"
echo ""
echo "  2. Link Supabase project:"
echo "     supabase link --project-ref <your-project-ref>"
echo ""
echo "  3. Apply database migrations:"
echo "     supabase db push"
echo ""
echo "  4. Verify connection:"
echo "     pnpm test:integration"
echo ""
echo "  5. Read the playbook:"
echo "     open playbook/ai-native-company-playbook-v2.4.pdf"
echo ""
echo "  6. Start Claude Code session:"
echo "     claude code ."
echo ""
echo "════════════════════════════════════════════════════════"
