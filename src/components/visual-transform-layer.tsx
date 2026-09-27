import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import { getBlockGeometry, type Block } from "@/lib/templates";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Mode = "drag" | "resize" | "rotate";
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type SafeGeometry = ReturnType<typeof getBlockGeometry>;

type Props = {
  root: HTMLDivElement | null;
  blocks: Block[];
  selectedIds: string[];
  zoom: number;
  onChange: (update: (blocks: Block[]) => Block[]) => void;
};

const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const minSize = 24;

function pointer(event: PointerEvent | ReactPointerEvent): Point {
  return {
    x: Number.isFinite(event.clientX) ? event.clientX : 0,
    y: Number.isFinite(event.clientY) ? event.clientY : 0,
  };
}

function isFinitePoint(value: Point | undefined): value is Point {
  return Boolean(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function isValidRect(rect: DOMRect | undefined): rect is DOMRect {
  return Boolean(rect) && [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
}

function safeGeometry(block: Block): SafeGeometry {
  try {
    const geometry = getBlockGeometry(block);
    return Object.fromEntries(Object.entries(geometry).filter(([, value]) => typeof value === "number" && Number.isFinite(value))) as SafeGeometry;
  } catch (error) {
    console.error("[VisualTransformLayer] Falha ao ler geometria do bloco", error);
    return {};
  }
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum?: number) {
  if (!Number.isFinite(value)) return minimum;
  const safeMaximum = maximum !== undefined && Number.isFinite(maximum) ? maximum : Number.POSITIVE_INFINITY;
  return Math.max(minimum, Math.min(safeMaximum, value));
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
    const message = this.state.error.message || "Erro inesperado na camada de transformação.";
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-destructive/40 bg-background/95 px-4 py-3 text-sm shadow-lg">
        <p className="font-medium text-destructive">Não foi possível ativar as ferramentas de transformação.</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">{message}</p>
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
  const [rects, setRects] = useState<Record<string, DOMRect>>({});
  const interaction = useRef<{
    mode: Mode;
    handle?: Handle;
    start: Point;
    initial: Record<string, { rect: DOMRect; geometry: SafeGeometry }>;
    center: Point;
  } | null>(null);
  const scale = Number.isFinite(zoom) && zoom > 0 ? zoom / 100 : 1;
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  const selected = useMemo(
    () => safeBlocks.filter((block) => block && typeof block.id === "string" && safeSelectedIds.includes(block.id) && !block.locked),
    [safeBlocks, safeSelectedIds],
  );
  const measurableSelected = useMemo(
    () => selected.filter((block) => isValidRect(rects[block.id])),
    [selected, rects],
  );

  const measure = useCallback(() => {
    if (!root || !Array.isArray(selected)) {
      setRects({});
      return;
    }
    const next: Record<string, DOMRect> = {};
    try {
      const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-editor-block]"));
      for (const block of selected) {
        const element = elements.find((candidate) => candidate.getAttribute("data-editor-block") === block.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (isValidRect(rect)) next[block.id] = rect;
      }
    } catch (error) {
      console.error("[VisualTransformLayer] Falha ao medir elementos", error);
    }
    setRects(next);
  }, [root, selected]);

  useEffect(() => {
    measure();
    const observer = root && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (root) observer?.observe(root);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [measure, root, safeBlocks, safeSelectedIds, zoom]);

  if (!root || !selected.length || measurableSelected.length !== selected.length) return null;
  const measured = measurableSelected.map((block) => rects[block.id]).filter(isValidRect);
  if (measured.length !== selected.length) return null;

  const bounds = {
    left: Math.min(...measured.map((rect) => rect.left)),
    top: Math.min(...measured.map((rect) => rect.top)),
    right: Math.max(...measured.map((rect) => rect.right)),
    bottom: Math.max(...measured.map((rect) => rect.bottom)),
  };
  if (![bounds.left, bounds.top, bounds.right, bounds.bottom].every(Number.isFinite)) return null;

  const width = Math.max(minSize, bounds.right - bounds.left);
  const height = Math.max(minSize, bounds.bottom - bounds.top);
  const center = { x: bounds.left + width / 2, y: bounds.top + height / 2 };
  if (!isFinitePoint(center)) return null;

  const startInteraction = (event: ReactPointerEvent, mode: Mode, handle?: Handle) => {
    const start = pointer(event);
    if (!isFinitePoint(start) || !isFinitePoint(center) || measurableSelected.length !== selected.length) return;
    const initialEntries = measurableSelected.map((block) => {
      const rect = rects[block.id];
      if (!isValidRect(rect)) return null;
      return [block.id, { rect, geometry: safeGeometry(block) }] as const;
    }).filter((entry): entry is readonly [string, { rect: DOMRect; geometry: SafeGeometry }] => Boolean(entry));
    if (initialEntries.length !== selected.length) return;

    event.preventDefault();
    event.stopPropagation();
    interaction.current = {
      mode,
      handle,
      start,
      center,
      initial: Object.fromEntries(initialEntries),
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      console.error("[VisualTransformLayer] Falha ao capturar ponteiro", error);
    }
  };

  const updateInteraction = (event: ReactPointerEvent) => {
    const current = interaction.current;
    if (!current) return;
    const currentPoint = pointer(event);
    if (!isFinitePoint(currentPoint) || !isFinitePoint(current.start)) return;
    const delta = {
      x: (currentPoint.x - current.start.x) / scale,
      y: (currentPoint.y - current.start.y) / scale,
    };
    if (!isFinitePoint(delta)) return;

    if (current.mode === "drag") {
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || !isValidRect(item.rect) || block.locked) return block;
        return { ...block, x: finiteOr(item.geometry.x, 0) + delta.x, y: finiteOr(item.geometry.y, 0) + delta.y };
      }));
    } else if (current.mode === "resize") {
      const handle = current.handle;
      if (!handle || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      const horizontal = handle.includes("e") ? delta.x : handle.includes("w") ? -delta.x : 0;
      const vertical = handle.includes("s") ? delta.y : handle.includes("n") ? -delta.y : 0;
      const scaleX = clamp((width + horizontal) / width, minSize / width);
      const scaleY = clamp((height + vertical) / height, minSize / height);
      if (![scaleX, scaleY].every(Number.isFinite)) return;
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || !isValidRect(item.rect) || block.locked) return block;
        const relativeX = (item.rect.left - bounds.left) / width;
        const relativeY = (item.rect.top - bounds.top) / height;
        const nextWidth = Math.max(minSize, item.rect.width * scaleX / scale);
        const nextHeight = Math.max(minSize, item.rect.height * scaleY / scale);
        const nextX = finiteOr(item.geometry.x, 0) + (handle.includes("w") ? delta.x : 0) + relativeX * width * (scaleX - 1);
        const nextY = finiteOr(item.geometry.y, 0) + (handle.includes("n") ? delta.y : 0) + relativeY * height * (scaleY - 1);
        if (![nextX, nextY, nextWidth, nextHeight].every(Number.isFinite)) return block;
        return { ...block, x: nextX, y: nextY, width: nextWidth, height: nextHeight };
      }));
    } else {
      const startAngle = Math.atan2(current.start.y - current.center.y, current.start.x - current.center.x);
      const currentAngle = Math.atan2(currentPoint.y - current.center.y, currentPoint.x - current.center.x);
      if (![startAngle, currentAngle].every(Number.isFinite)) return;
      const degrees = (currentAngle - startAngle) * (180 / Math.PI);
      if (!Number.isFinite(degrees)) return;
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || !isValidRect(item.rect) || block.locked) return block;
        return { ...block, rotation: finiteOr(item.geometry.rotation, 0) + degrees };
      }));
    }
    measure();
  };

  const endInteraction = () => {
    interaction.current = null;
    measure();
  };

  return (
    <div className="pointer-events-none fixed z-40" style={{ left: bounds.left, top: bounds.top, width, height }} aria-label="Transformação do elemento selecionado">
      <div className="absolute inset-0 border-2 border-primary/80" />
      <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <button type="button" aria-label="Girar seleção" className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm" onPointerDown={(event) => startInteraction(event, "rotate")} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction}>
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {handles.map((handle) => {
        const horizontal = handle.includes("w") ? "left-0" : handle.includes("e") ? "right-0" : "left-1/2 -translate-x-1/2";
        const vertical = handle.includes("n") ? "top-0" : handle.includes("s") ? "bottom-0" : "top-1/2 -translate-y-1/2";
        const cursor = handle === "n" || handle === "s" ? "ns-resize" : handle === "e" || handle === "w" ? "ew-resize" : `${handle.includes("n") ? "n" : "s"}${handle.includes("e") ? "e" : "w"}-resize`;
        return <button key={handle} type="button" aria-label={`Redimensionar ${handle}`} className={cn("pointer-events-auto absolute h-3 w-3 rounded-sm border-2 border-primary bg-background", horizontal, vertical)} style={{ cursor }} onPointerDown={(event) => startInteraction(event, "resize", handle)} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} />;
      })}
      <div className="pointer-events-auto absolute inset-0 cursor-move" onPointerDown={(event) => startInteraction(event, "drag")} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} />
    </div>
  );
}
