import React from "react";
import Board from "../board";
import type Shape from "../shapes/shape";
import type { CustomShapeDef, modes, submodes } from "../types";

type BoardOptions = {
  width: number;
  container?: HTMLElement;
  height: number;
  background: string;
  foreground: string;
  initialShapes?: any[];
  customShapes?: CustomShapeDef[];
  snap?: boolean;
  snapGrid?: boolean;
  locked?: boolean;
  hoverEffect?: boolean;
  clickEffect?: boolean;

  onImageUpload?: (file: File) => Promise<string>;
  onBoardReady?: (b: Board) => void;
  onModeChange?: (m: modes, sm: submodes) => void;
  onActiveShape?: (shape: Shape | null, board: Board) => void;
  onZoom?: (view: { x: number; y: number; scl: number }, board: Board) => void;
  onScroll?: (view: { x: number; y: number; scl: number }, board: Board) => void;
}

export function useBoardEngine(options: BoardOptions) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const canvas2Ref = React.useRef<HTMLCanvasElement>(null);
  const remoteCanvasRef = React.useRef<HTMLCanvasElement>(null);

  const boardRef = React.useRef<Board | null>(null);

  // Keep the latest React callbacks without recreating Board.
  const onActiveShapeRef = React.useRef(options.onActiveShape);
  const onZoomRef = React.useRef(options.onZoom);
  const onScrollRef = React.useRef(options.onScroll);
  const onModeChangeRef = React.useRef(options.onModeChange);

  // Update refs on every render.
  onActiveShapeRef.current = options.onActiveShape;
  onZoomRef.current = options.onZoom;
  onScrollRef.current = options.onScroll;
  onModeChangeRef.current = options.onModeChange;

  React.useLayoutEffect(() => {
    if (!canvas2Ref.current || !canvasRef.current) return;
    const board = new Board({
      hoverEffect: options.hoverEffect ?? false,
      clickEffect: options.clickEffect ?? false,
      isLocked: options.locked || false,
      snap: options.snap,
      snapGrid: options.snapGrid,
      onImageUpload: options.onImageUpload,
      container: options.container,
      canvas: canvasRef.current,
      canvas2: canvas2Ref.current,
      canvasRemote: remoteCanvasRef.current,
      width: options.width,
      height: options.height,
      background: options.background,
      foreground: options.foreground,
      initialShapes: options.initialShapes || [],
      onActiveShape: (shape) => {
        onActiveShapeRef.current?.(shape, board);
      },
      onModeChange: (m, sm) => {
        onModeChangeRef.current?.(m, sm);
      },
      onZoom: (view) => {
        onZoomRef.current?.(view, board);
      },
      onScroll: (view) => {
        onScrollRef.current?.(view, board);
      },
      customShapes: options.customShapes,
    });
    boardRef.current = board
    if (options.onBoardReady)
      options.onBoardReady(board);

    return () => {
      board.clean();
      boardRef.current = null;
    }
  }, [])

  React.useLayoutEffect(() => {
    if (boardRef.current) {
      boardRef.current.isLocked = options.locked ?? false;
      boardRef.current.snap = options.snap ?? false;
      boardRef.current.hoverEffect = options.hoverEffect ?? false;
      boardRef.current.clickEffect = options.clickEffect ?? false;
      boardRef.current.foreground = options.foreground;
      boardRef.current.background = options.background;
      boardRef.current.snapGrid = options.snapGrid ?? false;
      boardRef.current.setCanvasHeight = options.height;
      boardRef.current.setCanvasWidth = options.width;
    }
  }, [options.locked, options.snap, options.foreground, options.hoverEffect, options.clickEffect, options.background, options.snapGrid, options.width, options.height]);

  return {
    canvas2Ref,
    canvasRef,
    remoteCanvasRef,
    boardRef
  }
}
