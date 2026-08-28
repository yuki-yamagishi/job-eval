# JobEval-MD Agent Guidelines & Development Harness

JobEval-MD is an AI-powered job evaluation and Markdown document management desktop app built with **Tauri v2 + React 18 (TypeScript) + Vite + Tailwind CSS**.

---

## 1. Architecture Overview

The codebase is organized according to Domain-Driven & Feature-Driven Clean Architecture:

```
src/
  ├── core/               # Pure business logic (UI independent, 100% unit-testable)
  │   ├── scoring/        # Multi-axis job suitability scoring engine (40/30/20/10%)
  │   ├── markdown/       # Markdown & Frontmatter template generator and parser
  │   └── constants/      # Defaults (defaultProfile, defaultRules)
  ├── services/           # External & persistence adapters
  │   ├── storage/        # StorageAdapter (Dual: Tauri FS / Browser LocalStorage)
  │   └── ai/             # AI Providers (AiProvider interface: GeminiAiProvider, MockAiProvider)
  ├── hooks/              # Custom React hooks (state & storage synchronization)
  │   ├── useProfile.ts   # Profile management hook
  │   └── useJobs.ts      # Saved jobs & markdown manager hook
  ├── features/           # Feature UI modules
  │   ├── input/          # Job intake & clipboard paste pane
  │   ├── preview/        # AI score card & Markdown rich preview pane
  │   ├── dashboard/      # Job documents list & pipeline matrix
  │   └── profile/        # Candidate profile & preferences settings
  ├── components/         # Shared UI & Layout components (shadcn/ui inspired)
  │   ├── ui/             # Atomic components (button, card, input, badge, tabs, etc.)
  │   └── layout/         # Header, Navigation, MainLayout
  ├── types/              # TypeScript type definitions
  │   ├── job.ts
  │   ├── profile.ts
  │   └── storage.ts
  └── lib/                # Utility helpers (cn, formatters)
tests/                    # Automated Test Harness
  ├── fixtures/           # Sample jobs (Leverages, Bizreach, Doda, NG), profiles
  ├── core/               # Tests for core scoring & markdown generators & pipeline integration
  ├── services/           # Tests for storage adapters & AI integration
  └── features/           # React UI component tests
```

---

## 2. Development & Verification Commands

Antigravity Agents should use the following commands to test and verify changes:

| Command | Purpose |
| :--- | :--- |
| `npm run check` | **One-shot Full Verification**: Runs `tsc --noEmit` + `vitest run` + `vite build` |
| `npm run test:run` | Run all unit tests with Vitest once |
| `npm run test` | Run tests in watch mode |
| `npm run dev` | Start Vite local development server on port 1420 |
| `npm run build` | Compile TypeScript and bundle frontend for production |

---

## 3. Key Design Rules for Agents

1. **Pure Core Logic**: Never import React or UI components into `src/core/`. Core logic must remain 100% unit-testable without DOM dependencies.
2. **Dual-Storage Compatibility**: All persistence must go through `StorageAdapter`. It automatically uses Tauri's FS plugin when running in desktop mode and falls back to Web `localStorage` during development/browser preview.
3. **Pluggable AI Provider**: Use `AiProvider` interface. Offline tests and preview use `MockAiProvider` so tests never fail without API keys.
4. **Type Safety**: Avoid `any`. Always use types defined in `src/types/`.
5. **Dark Mode & Aesthetics**: Use Tailwind tokens defined in `src/index.css`. Maintain sleek, dark-mode-first glassmorphism aesthetics.
6. **Always Verify**: After making edits, always run `npm run check` to ensure zero type errors, 100% passing tests, and successful build output.
