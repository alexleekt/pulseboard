# Pulseboard

A local-first team member tracking application with AI-powered insights. Track team member profiles, superpowers, growth areas, work diaries, and get intelligent recommendations for project assignments.

## Features

- **Multi-Company Support**: Manage teams across multiple companies
- **Team Member Profiles**: Track influence, impact, superpowers (3-5), and growth areas (3-5)
- **Work Diary**: Timestamped entries with editable dates
- **Company Context**: Define company values, themes, and decision-making principles
- **AI-Powered Insights**: Ask questions about team members and get recommendations
- **Timeline Filters**: View data across 1M, 3M, 6M, 1Y, or all-time periods
- **Dual-Model Queries**: Get better responses by querying multiple LLMs in parallel
- **MCP Integration**: Extend functionality with Model Context Protocol servers
- **100% Offline**: All data and AI processing stays local

## Prerequisites

- [Bun](https://bun.sh) - JavaScript runtime and package manager
- [Ollama](https://ollama.com) - Local LLM runtime
- [Docker](https://www.docker.com/) - For ChromaDB vector database

## Installation

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Install Ollama

```bash
# macOS
brew install ollama

# Or download from https://ollama.com
```

### 3. Install Docker

Download and install Docker Desktop from:
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Linux: https://docs.docker.com/engine/install/
- Windows: https://docs.docker.com/desktop/install/windows-install/

### 4. Pull Ollama Models

```bash
# Primary LLM (recommended)
ollama pull qwen2.5:14b

# Optional: Judge model for dual-model mode
ollama pull qwen2.5:32b

# Embedding model
ollama pull nomic-embed-text
```

### 5. Install Project Dependencies

```bash
bun install
```

### 6. Start Services

```bash
# Start Ollama server (in a separate terminal)
ollama serve

# Start ChromaDB (using the helper script)
./scripts/chromadb.sh start
```

## Usage

### Development

```bash
# Start the Next.js development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Managing ChromaDB

You can manage ChromaDB using either the script directly or via npm/bun scripts:

```bash
# Using bun scripts (recommended)
bun run chroma:start    # Start ChromaDB
bun run chroma:stop     # Stop ChromaDB
bun run chroma:restart  # Restart ChromaDB
bun run chroma:status   # Check status
bun run chroma:logs     # View logs

# Or use the script directly
./scripts/chromadb.sh start
./scripts/chromadb.sh stop
./scripts/chromadb.sh restart
./scripts/chromadb.sh status
./scripts/chromadb.sh logs
./scripts/chromadb.sh clean  # Clean all data (WARNING: Destructive!)
```

ChromaDB will be available at `http://localhost:8000` and data will be persisted in `./data/chroma/`.

### Production Build

```bash
bun run build
bun start
```

## Configuration

On first run, configure the app in the Settings page:

1. **Ollama Configuration**
   - Host: `http://localhost:11434` (default)
   - Primary model: `qwen2.5:14b`
   - Judge model: `qwen2.5:32b` (optional, for dual-model mode)
   - Embedding model: `nomic-embed-text`

2. **MCP Servers** (optional)
   - Add MCP server configurations for extended functionality

3. **Feature Toggles**
   - Enable/disable dual-model mode
   - Configure timeline defaults

## Data Storage

All data is stored locally in the `./data/` directory:

```
data/
├── settings.json       # App configuration
└── chroma/            # ChromaDB vector database (Docker volume)
    ├── chroma.sqlite3
    └── index/
```

The ChromaDB data is stored as portable flat files, making it easy to:
- **Backup**: Copy the `./data/` directory
- **Migrate**: Move the `./data/` directory to another machine
- **Version Control**: The directory structure is git-ignored by default

### Backup

To backup your data, simply copy the entire `./data/` directory:

```bash
# Create a backup
cp -r data/ backup-$(date +%Y%m%d)/

# Or compress it
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

### Restore

To restore from a backup:

```bash
# Stop services first
./scripts/chromadb.sh stop

# Restore data
cp -r backup-20250101/ data/

# Restart services
./scripts/chromadb.sh start
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Vector Database**: ChromaDB (local, flat files)
- **LLM**: Ollama (local, offline-capable)
- **MCP**: Model Context Protocol for extensibility
- **Package Manager**: Bun

## Architecture

- **LLM-Agnostic**: Abstraction layer supports multiple LLM providers
- **Multi-Model Support**: Query multiple models and select best response
- **RAG System**: Semantic search over team member data
- **Auto-Update**: Profile sections update intelligently when related data changes
- **Company Context**: All profiles contextualized by company values

## License

MIT
