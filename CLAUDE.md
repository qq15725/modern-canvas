# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Vite playground (playground/index.html)
pnpm build        # Build ESM bundle + TypeScript declarations
pnpm build:code   # Vite build only
pnpm build:tsc    # TypeScript declarations only
pnpm test         # Run Vitest tests
pnpm typecheck    # TypeScript type check
pnpm lint         # ESLint check
```

Run a single test file: `pnpm test src/path/to/file.test.ts`

## Architecture

**modern-canvas** is a WebGL 2D rendering engine. The public API is exported from `src/index.ts`.

### Scene Graph

The scene graph follows a tree structure rooted at `Engine` (extends `SceneTree`):

- `Node` (`src/scene/main/Node.ts`) — base node with lifecycle hooks (`_ready`, `_process`, `_destroy`) and parent/child management
- `SceneTree` (`src/scene/main/SceneTree.ts`) — manages the root node, rendering loop, and timeline
- `Engine` (`src/Engine.ts`) — top-level entry point; owns the WebGL canvas, asset manager, and input system

### 2D Layer

- `Node2D` — 2D transform node (position, rotation, scale, z-index)
- `Element2D` (`src/scene/2d/element/Element2D.ts`) — CSS-styled element with layout, text, shapes, and effects; the primary building block for UI
- `Camera2D` — viewport camera with pan/zoom
- `TextureRect2D`, `Video2D`, `Lottie2D` — specialized media nodes

`Element2D` composes three sub-objects: `Element2DShape` (geometry/fill/stroke), `Element2DText` (text rendering via `modern-text`), and effects/filters.

### Rendering

`WebGLRenderer` (`src/core/renderers/gl/`) handles low-level WebGL state. Each frame, `SceneTree` walks the scene graph and calls `_draw` on visible nodes. Effects and transitions are applied as post-process passes via `src/scene/effects/` and `src/scene/transitions/`.

### Asset System

`Assets` (`src/asset/`) manages loading and garbage collection (via `WeakRef`) for textures, fonts, videos, GIFs, Lottie animations, and JSON. Loaders are registered per MIME type.

### Animation

`Animation` (`src/scene/animation/`) drives keyframe-based property animation with easing functions. `Timeline` (`src/scene/main/Timeline.ts`) coordinates playback across the scene.

### CSS Utilities

`src/css/` parses CSS filter strings and transform origins into engine-native values. `src/css/index.ts` is the entry point.

### Math

`src/core/math/` provides `Aabb2D`, `Obb2D`, and related 2D geometry types. `Vector2` and `Transform2D` are used throughout the scene graph.

## Conventions

- ESM-only, no CommonJS
- Decorators (`@customNode`) register node types; defined in `src/core/decorators/`
- Property descriptors come from `modern-idoc`; use its `@property` decorator for reactive node properties
- Commit messages follow Angular convention: `feat:`, `fix:`, `refactor:`, etc.
