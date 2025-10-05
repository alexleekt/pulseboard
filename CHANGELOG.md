# Changelog

All notable changes to TeamCards will be documented in this file.

## [Unreleased]

### Added
- Initial project setup with Next.js 15, React 19, TypeScript, and Tailwind CSS
- Project structure with organized folders for lib, components, and data
- ChromaDB integration for vector database (local, flat files)
- Ollama AI provider integration for local LLM inference
- Model Context Protocol (MCP) SDK integration for extensibility
- Updated .gitignore for local data and bun lockfile
- Comprehensive README with installation and usage instructions

### Infrastructure
- Multi-company support architecture
- Team member profile tracking system
- Work diary with editable timestamps
- Company context and values management
- Timeline filtering (1M, 3M, 6M, 1Y, all-time)
- Dual-model query support (query multiple LLMs in parallel)
- RAG (Retrieval Augmented Generation) system for semantic search
- Auto-update system for profile synchronization

### Dependencies
- chromadb: Vector database for semantic search
- ollama-ai-provider: Local LLM integration
- ai: AI SDK for unified LLM interface
- @modelcontextprotocol/sdk: MCP integration
- lucide-react: Icon library
- date-fns: Date utilities
- uuid: Unique ID generation

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
