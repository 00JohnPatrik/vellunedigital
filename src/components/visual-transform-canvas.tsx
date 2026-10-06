// @ts-nocheck
import { useMemo, useRef, useState } from "react";
import { BlockView } from "@/components/block-render";
import type { Block } from "@/lib/templates";

type Point = { x: number; y: number };
type Guide = { axis: "x" | "y"; value: number };

type Props = {
  blocks: Block[];
  selectedIds: string[];
  zoom: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  ctx?: unknown;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (update: (blocks: Block[]) => Block[], group?: string) => void;
};

type Interaction = {
  mode: "move" | "resize" | "rotate";
  ids: string[];
  pointerId: number;
  start: Point;
  originals: Record<string, any>;
  bounds: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  handle?: string;
  aspect: number;
  center: Point;
};

const MIN_SIZE = 24;
const MAX_SIZE = 2000;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function geometry(block: any, index: number) {
  const width = Math.min(MAX_SIZE, Math.max(MIN_SIZE, number(block.width, 720)));
  const height = Math.min(MAX_SIZE, Math.max(MIN_SIZE, number(block.height, 72)));
  return {
    x: number(block.x, 24),
    y: number(block.y, 24 + index * 96),
    width,
    height,
    rotation: number(block.rotation, 0),
    scale: Math.max(0.1, number(block.scale, 1)),
  };
}

function boundsOf(blocks: any[], selectedIds: string[]) {
  const selected = blocks
    .map((block, index) => ({ block, geometry: geometry(block, index) }))
    .filter(({ block }) => selectedIds.includes(block.id));
  if (!selected.length) return null;
  const left = Math.min(...selected.map(({ geometry }) => geometry.x));
  const top = Math.min(...selected.map(({ geometry }) => geometry.y));
  const right = Math.max(...selected.map(({ geometry }) => geometry.x + geometry.width));
  const bottom = Math.max(...selected.map(({ geometry }) => geometry.y + geometry.height));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function pointerPoint(event: PointerEvent | React.PointerEvent, canvas: HTMLDivElement | null, zoom: number): Point {
  const rect = canvas?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  const scale = Math.max(0.01, zoom / 100);
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
}

function snap(value: number, candidates: number[], threshold = 8) {
  const candidate = candidates.find((item) => Math.abs(item - value) <= threshold);
  return candidate === undefined ? value : candidate;
}

function resizeBounds(start: Interaction, point: Point, shift: boolean) {
  const original = start.bounds;
  let left = original.left;
  let top = original.top;
  let right = original.right;
  let bottom = original.bottom;
  const dx = point.x - start.start.x;
  const dy = point.y - start.start.y;
  const handle = start.handle || "se";

  if (handle.includes("w")) left += dx;
  if (handle.includes("e")) right += dx;
  if (handle.includes("n")) top += dy;
  if (handle.includes("s")) bottom += dy;

  let width = Math.max(MIN_SIZE, Math.min(MAX_SIZE, right - left));
  let height = Math.max(MIN_SIZE, Math.min(MAX_SIZE, bottom - top));
  if (shift) {
    const ratio = start.aspect || 1;
    if (Math.abs(dx) >= Math.abs(dy)) height = Math.max(MIN_SIZE, Math.min(MAX_SIZE, width / ratio));
    else width = Math.max(MIN_SIZE, Math.min(MAX_SIZE, height * ratio));
    if (handle.includes("w")) left = right - width;
    else right = left + width;
    if (handle.includes("n")) top = bottom - height;
    else bottom = top + height;
  }
  return { left, top, width, height };
}

function cursorFor(handle: string) {
  if (handle === "rotate") return "crosshair";
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  return "nwse-resize";
}

export function VisualTransformCanvas({ blocks, selectedIds, zoom, canvasRef, ctx, onSelect, onChange }: Props) {
  const interaction = useRef<Interaction | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const selectedBounds = useMemo(() => boundsOf(blocks, selectedIds), [blocks, selectedIds]);
  const selected = blocks.filter((block: any) => selectedIds.includes(block.id));

  const begin = (event: React.PointerEvent, mode: Interaction["mode"], handle?: string, block?: any, index?: number) => {
    event.stopPropagation();
    if (mode !== "rotate" && block?.locked) return;
    const ids = selectedIds.includes(block?.id) ? selectedIds : block?.id ? [block.id] : selectedIds;
    const bounds = boundsOf(blocks, ids);
    if (!bounds || !ids.length) return;
    const originals = Object.fromEntries(blocks.filter((item: any) => ids.includes(item.id)).map((item: any, itemIndex: number) => [item.id, geometry(item, itemIndex)]));
    const point = pointerPoint(event, canvasRef.current, zoom);
    interaction.current = {
      mode,
      ids,
      pointerId: event.pointerId,
      start: point,
      originals,
      bounds,
      handle,
      aspect: bounds.width / Math.max(MIN_SIZE, bounds.height),
      center: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setGuides([]);
  };

  const move = (event: React.PointerEvent) => {
    const current = interaction.current;
    if (!current) return;
    const point = pointerPoint(event, canvasRef.current, zoom);
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;

    if (current.mode === "move") {
      let offsetX = dx;
      let offsetY = dy;
      const canvasWidth = canvasRef.current?.clientWidth || 768;
      const canvasHeight = canvasRef.current?.clientHeight || 640;
      const nextGuides: Guide[] = [];
      const movedCenterX = current.bounds.left + current.bounds.width / 2 + offsetX;
      const movedCenterY = current.bounds.top + current.bounds.height / 2 + offsetY;
      const snappedX = snap(movedCenterX, [canvasWidth / 2, ...blocks.filter((block: any) => !current.ids.includes(block.id)).map((block: any, index: number) => geometry(block, index).x + geometry(block, index).width / 2)]);
      const snappedY = snap(movedCenterY, [canvasHeight / 2, ...blocks.filter((block: any) => !current.ids.includes(block.id)).map((block: any, index: number) => geometry(block, index).y + geometry(block, index).height / 2)]);
      if (snappedX !== movedCenterX) { offsetX += snappedX - movedCenterX; nextGuides.push({ axis: "x", value: snappedX }); }
      if (snappedY !== movedCenterY) { offsetY += snappedY - movedCenterY; nextGuides.push({ axis: "y", value: snappedY }); }
      setGuides(nextGuides);
      onChange((items: any[]) => items.map((item: any) => {
        const original = current.originals[item.id];
        return original ? { ...item, x: Math.round(original.x + offsetX), y: Math.round(original.y + offsetY) } : item;
      }), "transform:move");
      return;
    }

    if (current.mode === "rotate") {
      const angle = Math.atan2(point.y - current.center.y, point.x - current.center.x) * 180 / Math.PI + 90;
      const base = Math.atan2(current.start.y - current.center.y, current.start.x - current.center.x) * 180 / Math.PI + 90;
      let rotation = angle - base + (current.originals[current.ids[0]]?.rotation || 0);
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      onChange((items: any[]) => items.map((item: any) => current.ids.includes(item.id) ? { ...item, rotation } : item), "transform:rotate");
      return;
    }

    const resized = resizeBounds(current, point, event.shiftKey);
    const sx = resized.width / Math.max(MIN_SIZE, current.bounds.width);
    const sy = resized.height / Math.max(MIN_SIZE, current.bounds.height);
    onChange((items: any[]) => items.map((item: any) => {
      const original = current.originals[item.id];
      if (!original) return item;
      return {
        ...item,
        x: Math.round(resized.left + (original.x - current.bounds.left) * sx),
        y: Math.round(resized.top + (original.y - current.bounds.top) * sy),
        width: Math.round(Math.max(MIN_SIZE, original.width * sx)),
        height: Math.round(Math.max(MIN_SIZE, original.height * sy)),
      };
    }), "transform:resize");
  };

  const end = () => {
    interaction.current = null;
    setGuides([]);
  };

  return <>
    {guides.map((guide, index) => <div key={`${guide.axis}-${index}`} className="pointer-events-none absolute z-[70] border-primary/70" style={guide.axis === "x" ? { left: guide.value, top: 0, bottom: 0, borderLeftWidth: 1, borderLeftStyle: "dashed" } : { top: guide.value, left: 0, right: 0, borderTopWidth: 1, borderTopStyle: "dashed" }} />)}
    {blocks.map((block: any, index: number) => {
      const value = geometry(block, index);
      const isSelected = selectedIds.includes(block.id);
      const hidden = block.hidden === true || block.visibility === false;
      return <div key={block.id || index} className={`group absolute left-0 top-0 rounded-xl ${isSelected ? "border-2 border-primary ring-2 ring-primary/30" : "border border-transparent hover:border-primary/40"} ${hidden ? "opacity-35" : ""}`} style={{ width: value.width, height: value.height, transform: `translate(${value.x}px, ${value.y}px) rotate(${value.rotation}deg) scale(${value.scale})`, transformOrigin: "center", opacity: block.opacity ?? 1, zIndex: block.zIndex ?? index + 1, touchAction: "none" }} onPointerDown={(event) => { if (hidden) return; onSelect(block.id, event.shiftKey || event.ctrlKey || event.metaKey); begin(event, "move", undefined, block, index); }} onClick={(event) => event.stopPropagation()}><div className="pointer-events-none h-full w-full"><BlockView block={block} ctx={ctx as any} interactive={false} /></div>{isSelected && <div className="absolute -top-7 left-0 max-w-full truncate rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">{String(block.type)}</div>}</div>;
    })}
    {selectedBounds && <div className="pointer-events-none absolute z-[80] border-2 border-primary" style={{ left: selectedBounds.left, top: selectedBounds.top, width: selectedBounds.width, height: selectedBounds.height }}>
      {selected.length === 1 && <button type="button" aria-label="Girar seleção" className="pointer-events-auto absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-7 rounded-full border-2 border-background bg-primary" style={{ cursor: cursorFor("rotate"), touchAction: "none" }} onPointerDown={(event) => begin(event, "rotate")} />}
      {HANDLES.map((handle) => { const position = { nw: "-left-2 -top-2", n: "left-1/2 -top-2 -translate-x-1/2", ne: "-right-2 -top-2", e: "-right-2 top-1/2 -translate-y-1/2", se: "-bottom-2 -right-2", s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", sw: "-bottom-2 -left-2", w: "-left-2 top-1/2 -translate-y-1/2" }[handle]; return <button key={handle} type="button" aria-label={`Redimensionar ${handle}`} className={`pointer-events-auto absolute h-4 w-4 rounded-full border-2 border-background bg-primary ${position}`} style={{ cursor: cursorFor(handle), touchAction: "none" }} onPointerDown={(event) => begin(event, "resize", handle)} />; })}
      {selected.length > 1 && <span className="absolute -top-7 left-0 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">{selected.length} elementos</span>}
    </div>}
    <div className="absolute inset-0 z-[90]" onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
  </>;
}
