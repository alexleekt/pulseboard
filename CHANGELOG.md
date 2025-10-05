# Changelog

All notable changes to Pulseboard will be documented in this file.

## [Unreleased]

### Added
- **LICENSE**: MIT License for open source distribution

### Changed
- **Git Configuration**: Updated to use GitHub noreply email for privacy

### Infrastructure
- **GitHub Repository**: Published to https://github.com/alexleekt/pulseboard

---

## Previous Session Changes

### Added
- **WORKING.md**: Real-time work coordination to prevent multi-agent conflicts
  - Active work tracking with file lists and timestamps
  - Recent completions history (last 5 entries)
  - Guidelines for claiming, updating, and clearing work
  - Lock mechanism to prevent simultaneous edits
- **TODO.md**: Task tracking system for multi-agent workflow
  - Status indicators (🔴 Blocked, 🟡 In Progress, 🟢 Completed, ⚪ Pending)
  - Priority levels (High, Medium, Low)
  - Agent assignment field to clarify ownership
  - Task template with acceptance criteria, context, and files affected
  - Backlog and sprint organization
  - Implementation checklist for agents

### Changed
- **CLAUDE.md**: Defined Claude's role as planner, bug fixer, and task tracker (not feature implementer)
  - Workflow documentation for feature requests, bug fixes, and code review
  - Updated project instructions to reference AGENTS.md
- **AGENTS.md**: Comprehensive multi-agent collaboration framework
  - Task workflow: Claude plans → Agents implement → Claude reviews
  - Agent responsibilities and collaboration process
  - **Multi-agent commit format**: `[agent-name] type: description`
  - **File ownership guidelines**: Clear primary ownership (Claude for docs, others for code)
  - **Conflict prevention protocol**: WORKING.md coordination, pull-before-start, backup strategies
  - **Shared file handling**: Special procedures for high-risk files (data/*.json, package.json)

## [0.3.0] - 2025-10-05

### Added
- **Quick Diary Entry System** (Homepage):
  - Markdown editor for composing diary entries
  - Auto-save functionality with 2-second delay
  - Draft persistence in `diary-drafts.json`
  - LLM-powered classification to auto-assign entries to team members
  - @mentions for team members (e.g., @john-doe)
  - ^mentions for companies (e.g., ^acme-corp)
  - Real-time handle suggestions while typing
  - Direct assignment when exactly one teammate is tagged
  - API routes: `/api/diaries/quick` (POST/GET) and `/api/diaries/quick/[id]` (PUT/DELETE)
- **GeneratingStatus Component**:
  - Real-time progress indicator for LLM operations
  - Elapsed time counter updating every 250ms
  - Shows seconds with decimal precision during generation
  - Rounded display format after completion
  - Indeterminate spinner with animated icon
- **Enhanced Member Profile Pages**:
  - Improved UI and layout (465+ lines of enhancements)
  - Better data presentation and interaction

### Changed
- **Homepage**: Complete redesign with quick diary entry as primary feature
- **Project Name**: Officially renamed to "Pulseboard"
- **README.md**: Updated branding and project name
- **Data Store**: Added support for diary drafts

### Dependencies Added
- `@uiw/react-markdown-preview`: Markdown preview rendering
- `@uiw/react-md-editor`: Rich markdown editing experience

## [0.2.0] - 2025-10-04

### Added
- **Settings Page**: Full UI for configuring Ollama with connection testing
- **Company Management**: Complete CRUD system for companies
  - Company list page with grid view
  - Company create/edit forms
  - API routes for companies (GET, POST, PUT, DELETE)
  - JSON-based data storage
- **Data Store**: File-based storage system for companies, members, and diaries
- **AI-Assisted Company Setup**:
  - Auto-generate all company fields with one click
  - Per-field AI generation with refresh buttons
  - Manual override capability for all fields
  - Context-aware generation using existing data

### Features
- Settings page with Ollama connection testing and model detection
- Company values, themes, decision-making, and culture tracking
- AI-powered content generation for company profiles
- Beautiful UI with dark mode support
- Real-time form updates and validation
- Next.js 15 async params support

## [0.1.0] - 2025-10-04

### Added
- Project initialization with Next.js 15, React 19, TypeScript, Tailwind CSS
- Complete TypeScript type definitions for all entities
- Ollama client with single/dual-model support and embedding generation
- ChromaDB client with vector search and multi-company filtering
- Settings system with JSON-based configuration
- Settings API routes (GET/POST)
- Beautiful home page with navigation to all sections
- Comprehensive README with installation instructions
- PROJECT_STATUS.md tracking implementation progress

### Features
- **LLM Abstraction Layer**:
  - Single model chat
  - Dual-model chat with automatic judging
  - Streaming support
  - Embedding generation
  - Connection testing and model listing
- **Vector Database**:
  - Multi-collection support (companies, members, diaries)
  - Automatic embedding generation
  - Semantic search with metadata filters
  - Time-range filtering
  - Company context retrieval
- **Settings Management**:
  - JSON-based configuration storage
  - Default settings for Ollama and MCP
  - Load/save/update utilities
  - RESTful API endpoints

### Infrastructure
- Multi-company architecture ready
- RAG system foundation complete
- Dual-model query infrastructure
- MCP integration prepared (SDK installed)
- Development server running on http://localhost:3000
