import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import { getBlockGeometry, type Block } from "@/lib/templates";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Mode = "drag" | "resize" | "rotate";
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

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
  return { x: event.clientX, y: event.clientY };
}

function clamp(value: number, minimum: number, maximum?: number) {
  return Math.max(minimum, maximum === undefined ? Number.POSITIVE_INFINITY : Math.min(maximum, value));
}

export function VisualTransformLayer({ root, blocks, selectedIds, zoom, onChange }: Props) {
  const [rects, setRects] = useState<Record<string, DOMRect>>({});
  const interaction = useRef<{
    mode: Mode;
    handle?: Handle;
    start: Point;
    initial: Record<string, { rect: DOMRect; geometry: ReturnType<typeof getBlockGeometry> }>;
    center?: Point;
  } | null>(null);
  const scale = Number.isFinite(zoom) && zoom > 0 ? zoom / 100 : 1;
  const selected = useMemo(() => blocks.filter((block) => selectedIds.includes(block.id) && !block.locked), [blocks, selectedIds]);
  const measurableSelected = useMemo(() => selected.filter((block) => rects[block.id]), [selected, rects]);

  const measure = useCallback(() => {
    if (!root) return;
    const next: Record<string, DOMRect> = {};
    for (const block of selected) {
      const escapedId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(block.id)
        : block.id.replace(/([\\"\\'])/g, "\\\\$1");
      const element = root.querySelector<HTMLElement>(`[data-editor-block="${escapedId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        if ([rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) {
          next[block.id] = rect;
        }
      }
    }
    setRects(next);
  }, [root, selected]);

  useEffect(() => {
    measure();
    const observer = root ? new ResizeObserver(measure) : null;
    if (root) observer?.observe(root);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [measure, root, blocks, selectedIds, zoom]);

  if (!root || !measurableSelected.length) return null;
  const measured = measurableSelected.map((block) => rects[block.id]).filter((rect): rect is DOMRect => Boolean(rect));
  if (!measured.length) return null;
  const bounds = {
    left: Math.min(...measured.map((rect) => rect.left)),
    top: Math.min(...measured.map((rect) => rect.top)),
    right: Math.max(...measured.map((rect) => rect.right)),
    bottom: Math.max(...measured.map((rect) => rect.bottom)),
  };
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const center = { x: bounds.left + width / 2, y: bounds.top + height / 2 };

  const startInteraction = (event: ReactPointerEvent, mode: Mode, handle?: Handle) => {
    event.preventDefault();
    event.stopPropagation();
    const start = pointer(event);
    interaction.current = {
      mode,
      handle,
      start,
      center,
      initial: Object.fromEntries(measurableSelected.map((block) => {
        const rect = rects[block.id];
        return [block.id, { rect, geometry: getBlockGeometry(block) }];
      }).filter((entry): entry is [string, { rect: DOMRect; geometry: ReturnType<typeof getBlockGeometry> }] => Boolean(entry[1].rect))) as Record<string, { rect: DOMRect; geometry: ReturnType<typeof getBlockGeometry> }>,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateInteraction = (event: ReactPointerEvent) => {
    const current = interaction.current;
    if (!current) return;
    const delta = { x: (event.clientX - current.start.x) / scale, y: (event.clientY - current.start.y) / scale };
    if (current.mode === "drag") {
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || !item.rect || block.locked) return block;
        const startX = Number.isFinite(item.geometry.x) ? item.geometry.x! : 0;
        const startY = Number.isFinite(item.geometry.y) ? item.geometry.y! : 0;
        return { ...block, x: startX + delta.x, y: startY + delta.y };
      }));
    } else if (current.mode === "resize") {
      const handle = current.handle!;
      const horizontal = handle.includes("e") ? delta.x : handle.includes("w") ? -delta.x : 0;
      const vertical = handle.includes("s") ? delta.y : handle.includes("n") ? -delta.y : 0;
      const scaleX = clamp((width + horizontal) / width, minSize / width);
      const scaleY = clamp((height + vertical) / height, minSize / height);
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || !item.rect || block.locked) return block;
        const relativeX = (item.rect.left - bounds.left) / width;
        const relativeY = (item.rect.top - bounds.top) / height;
        const nextWidth = Math.max(minSize, item.rect.width * scaleX / scale);
        const nextHeight = Math.max(minSize, item.rect.height * scaleY / scale);
        const startX = Number.isFinite(item.geometry.x) ? item.geometry.x! : 0;
        const startY = Number.isFinite(item.geometry.y) ? item.geometry.y! : 0;
        const nextX = startX + (handle.includes("w") ? delta.x : 0) + relativeX * width * (scaleX - 1);
        const nextY = startY + (handle.includes("n") ? delta.y : 0) + relativeY * height * (scaleY - 1);
        return { ...block, x: nextX, y: nextY, width: nextWidth, height: nextHeight };
      }));
    } else {
      const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x) - Math.atan2(current.start.y - center.y, current.start.x - center.x);
      const degrees = angle * (180 / Math.PI);
      onChange((currentBlocks) => currentBlocks.map((block) => {
        const item = current.initial[block.id];
        if (!item || block.locked) return block;
        return { ...block, rotation: (item.geometry.rotation ?? 0) + degrees };
      }));
    }
    measure();
  };

  const endInteraction = () => { interaction.current = null; measure(); };

  return (
    <div className="pointer-events-none fixed z-40" style={{ left: bounds.left, top: bounds.top, width, height }} aria-label="Transformação do elemento selecionado">
      <div className="absolute inset-0 border-2 border-primary/80" />
      <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <button type="button" aria-label="Girar seleção" className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm" onPointerDown={(event) => startInteraction(event, "rotate")} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction}><RotateCw className="h-3.5 w-3.5" /></button>
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
