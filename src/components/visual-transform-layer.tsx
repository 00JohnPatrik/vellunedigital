import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { getBlockGeometry, type Block } from "@/lib/templates";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Mode = "drag" | "resize" | "rotate";
type Handle = "nw" | "ne" | "se" | "sw";
type SafeGeometry = ReturnType<typeof getBlockGeometry>;

type Props = {
  root: HTMLDivElement | null;
  blocks: Block[];
  selectedIds: string[];
  zoom: number;
  onChange: (update: (blocks: Block[]) => Block[]) => void;
};

type InitialState = {
  block: Block;
  rect: DOMRect;
  geometry: SafeGeometry;
};

type Interaction = {
  pointerId: number;
  mode: Mode;
  handle?: Handle;
  start: Point;
  center: Point;
  initial: InitialState;
};

const handles: Handle[] = ["nw", "ne", "se", "sw"];
const minSize = 24;

function toPoint(event: PointerEvent | ReactPointerEvent): Point {
  return {
    x: Number.isFinite(event.clientX) ? event.clientX : 0,
    y: Number.isFinite(event.clientY) ? event.clientY : 0,
  };
}

function isFinitePoint(point: Point | undefined): point is Point {
  return Boolean(point) && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isValidRect(rect: DOMRect | undefined): rect is DOMRect {
  return Boolean(rect)
    && [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0
    && rect.height > 0;
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeGeometry(block: Block): SafeGeometry {
  try {
    const geometry = getBlockGeometry(block);
    return Object.fromEntries(
      Object.entries(geometry).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
    ) as SafeGeometry;
  } catch (error) {
    console.error("[VisualTransformLayer] Falha ao ler geometria do bloco", error);
    return {};
  }
}

function scaleFromZoom(zoom: number) {
  return Number.isFinite(zoom) && zoom > 0 ? zoom / 100 : 1;
}

class VisualTransformErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[VisualTransformLayer]", {
      message: error?.message ?? String(error),
      stack: error?.stack ?? "",
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-destructive/40 bg-background/95 px-4 py-3 text-sm shadow-lg">
        <p className="font-medium text-destructive">Não foi possível ativar as ferramentas de transformação.</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {this.state.error.message || "Erro inesperado na camada de transformação."}
        </p>
      </div>
    );
  }
}

export function VisualTransformLayer(props: Props) {
  return (
    <VisualTransformErrorBoundary>
      <VisualTransformLayerContent {...props} />
    </VisualTransformErrorBoundary>
  );
}

function VisualTransformLayerContent({ root, blocks, selectedIds, zoom, onChange }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const interaction = useRef<Interaction | null>(null);
  const measureFrame = useRef<number | null>(null);
  const scale = scaleFromZoom(zoom);

  const selected = useMemo(() => {
    if (!Array.isArray(blocks) || !Array.isArray(selectedIds) || selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    if (typeof id !== "string" || !id) return null;
    const block = blocks.find((item) => item?.id === id);
    return block && !block.locked ? block : null;
  }, [blocks, selectedIds]);

  const measure = useCallback(() => {
    if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current);
    measureFrame.current = requestAnimationFrame(() => {
      measureFrame.current = null;
      if (!root || !selected) {
        setRect(null);
        return;
      }
      try {
        const element = Array.from(root.querySelectorAll<HTMLElement>("[data-editor-block]"))
          .find((candidate) => candidate.getAttribute("data-editor-block") === selected.id);
        const next = element?.getBoundingClientRect();
        setRect(isValidRect(next) ? next : null);
      } catch (error) {
        console.error("[VisualTransformLayer] Falha ao medir elemento", error);
        setRect(null);
      }
    });
  }, [root, selected]);

  useEffect(() => {
    measure();
    const observer = root && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (root) observer?.observe(root);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, root, zoom, blocks]);

  const finishInteraction = useCallback(() => {
    interaction.current = null;
    measure();
  }, [measure]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const current = interaction.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const point = toPoint(event);
      if (!isFinitePoint(point) || !isFinitePoint(current.start)) return;

      const delta = {
        x: (point.x - current.start.x) / scale,
        y: (point.y - current.start.y) / scale,
      };
      if (!isFinitePoint(delta)) return;

      if (current.mode === "drag") {
        onChange((items) => items.map((item) => {
          if (item.id !== current.initial.block.id || item.locked) return item;
          return {
            ...item,
            x: finiteOr(current.initial.geometry.x, 0) + delta.x,
            y: finiteOr(current.initial.geometry.y, 0) + delta.y,
          };
        }));
      } else if (current.mode === "resize" && current.handle) {
        const initialWidth = Math.max(minSize, finiteOr(current.initial.geometry.width, current.initial.rect.width / scale));
        const initialHeight = Math.max(minSize, finiteOr(current.initial.geometry.height, current.initial.rect.height / scale));
        const handle = current.handle;
        const leftDelta = handle.includes("w") ? delta.x : 0;
        const topDelta = handle.includes("n") ? delta.y : 0;
        const widthDelta = handle.includes("w") ? -delta.x : delta.x;
        const heightDelta = handle.includes("n") ? -delta.y : delta.y;
        const nextWidth = Math.max(minSize, initialWidth + widthDelta);
        const nextHeight = Math.max(minSize, initialHeight + heightDelta);
        const nextX = finiteOr(current.initial.geometry.x, 0) + (nextWidth === minSize && handle.includes("w") ? initialWidth - minSize : leftDelta);
        const nextY = finiteOr(current.initial.geometry.y, 0) + (nextHeight === minSize && handle.includes("n") ? initialHeight - minSize : topDelta);
        if (![nextWidth, nextHeight, nextX, nextY].every(Number.isFinite)) return;
        onChange((items) => items.map((item) => item.id === current.initial.block.id && !item.locked
          ? { ...item, x: nextX, y: nextY, width: nextWidth, height: nextHeight }
          : item));
      } else if (current.mode === "rotate") {
        const startAngle = Math.atan2(current.start.y - current.center.y, current.start.x - current.center.x);
        const currentAngle = Math.atan2(point.y - current.center.y, point.x - current.center.x);
        const degrees = (currentAngle - startAngle) * (180 / Math.PI);
        if (!Number.isFinite(degrees)) return;
        onChange((items) => items.map((item) => item.id === current.initial.block.id && !item.locked
          ? { ...item, rotation: finiteOr(current.initial.geometry.rotation, 0) + degrees }
          : item));
      }
      measure();
    };

    const onUp = (event: PointerEvent) => {
      if (interaction.current?.pointerId === event.pointerId) finishInteraction();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [finishInteraction, measure, onChange, scale]);

  if (!root || !selected || !isValidRect(rect)) return null;

  const width = Math.max(minSize, rect.width);
  const height = Math.max(minSize, rect.height);
  const center = { x: rect.left + width / 2, y: rect.top + height / 2 };
  if (!isFinitePoint(center)) return null;

  const startInteraction = (event: ReactPointerEvent, mode: Mode, handle?: Handle) => {
    if (!selected || !isValidRect(rect)) return;
    const start = toPoint(event);
    if (!isFinitePoint(start)) return;
    event.preventDefault();
    event.stopPropagation();
    interaction.current = {
      pointerId: event.pointerId,
      mode,
      handle,
      start,
      center,
      initial: { block: selected, rect, geometry: safeGeometry(selected) },
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      console.error("[VisualTransformLayer] Falha ao capturar ponteiro", error);
    }
  };

  return (
    <div
      className="pointer-events-none fixed z-40"
      style={{ left: rect.left, top: rect.top, width, height }}
      aria-label="Transformação do elemento selecionado"
    >
      <div
        className="pointer-events-auto absolute inset-0 cursor-move border-2 border-primary/80"
        onPointerDown={(event) => startInteraction(event, "drag")}
      />
      <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+12px)]">
        <button
          type="button"
          aria-label="Girar seleção"
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm"
          onPointerDown={(event) => startInteraction(event, "rotate")}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {handles.map((handle) => {
        const horizontal = handle.includes("w") ? "left-0" : "right-0";
        const vertical = handle.includes("n") ? "top-0" : "bottom-0";
        const cursor = handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize";
        return (
          <button
            key={handle}
            type="button"
            aria-label={`Redimensionar ${handle}`}
            className={cn("pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-primary bg-background", horizontal, vertical)}
            style={{ cursor }}
            onPointerDown={(event) => startInteraction(event, "resize", handle)}
          />
        );
      })}
    </div>
  );
}
