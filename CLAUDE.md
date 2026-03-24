# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start Vite dev server
bun build        # TypeScript check + Vite production build (app)
bun build:lib    # Build publishable library (ES + CJS + type defs)
bun lint         # Run ESLint
bun preview      # Preview production build
```

No test runner is configured. E2E tests use Playwright (no script defined yet).

## Architecture

This is a **React + Canvas whiteboard component library** (`@dhrubojyotiboro/board`) that can be embedded in other apps. The `/src/board/` directory is the publishable library; `/src/routes/` is a demo app.

### Core Layer: `Board` class (`src/board/board.ts`)
The canvas rendering engine. Manages:
- Direct HTML5 Canvas 2D rendering
- Pointer/touch/wheel event handling
- Tool switching and delegation
- `shapeStore` — a custom linked-list with undo/redo history
- `view` — `{x, y, scl}` camera/zoom state
- `activeShapes` — current selection
- A unified `evt` object normalized from raw DOM events (canvas-space and user-space coords)

### React Layer: `BoardProvider` → `BoardContext`
`board_provider.tsx` creates the `Board` instance, mounts the canvas, and manages React state (`activeShape`, `zoom`, `offset`, `snap`, `mode`/`submode`). `board-context.tsx` exposes these via `useBoard()` hook.

### Shape System (`src/board/shapes/`)
- `shape.ts` — abstract base class with common properties (position, size, rotation, stroke, fill, text, connections)
- Concrete shapes: `Rect`, `Ellipse`, `Text`, `ImageShape`, `SvgShape`, `Group`, line variants (`LinePlain`, `LineCurve`, `LineAnchor`), and path-based shapes in `shapes/paths/` (Arrow, Triangle, Star, Cloud, etc.)
- `shape_store.ts` — linked-list with z-order management and history stack for undo/redo

### Tool System (`src/board/tool/`)
Each tool implements: `pointerDown()`, `pointermove()`, `pointerup()`, `dblClick()`, `onClick()`, `cleanUp()`.

- `SelectionTool` — primary interaction (selection, drag, resize, rotate, inline text editing); the largest and most complex file (~33KB)
- `ShapeTool` — places shapes from the shape library
- `LineTool` — draws line variants
- `DrawTool` — freehand drawing via `perfect-freehand`
- `TextTool`, `EraserTool`, `ImageTool`

### UI Components (`src/board/components/`)
Toolbar, shape options panel, library sidebar, zoom controls. These consume `useBoard()` and are all re-exported from the library entry point (`src/lib.ts`).

### Library Export (`src/lib.ts`)
The public API: `BoardProvider`, `useBoard`, all shape classes, tools, and UI components + CSS.

## Key Patterns

- **Custom shapes**: Register via `board.addCustomShape()` — shapes must extend the base `Shape` class
- **Image upload**: Passed as a callback prop to `BoardProvider`
- **Persistence**: `snap`, `hover`, and `isMinimal` UI state are persisted in `localStorage`; canvas view (pan/zoom) is also persisted
- **Connections**: Shapes can have anchor points; `connections.ts` handles linking shapes together
- **Shape events**: `"shape:created"`, `"shape:updated"`, `"shape:removed"`, `"shape:move"`, `"resize"`, etc. — register listeners on the board or individual shapes
- **Z-order**: Managed through the linked-list shape store; shapes can be sent forward/back/to-front/to-back
