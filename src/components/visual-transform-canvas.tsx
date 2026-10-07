// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { BlockView } from "@/components/block-render";
import { EditorQuickToolbar, type ImageAction } from "@/components/editor-quick-toolbar";
import { resolveBlockGeometry, type Block } from "@/lib/templates";
import { fontCss } from "@/lib/blocks";

type Point = { x: number; y: number };
type Guide = { axis: "x" | "y"; value: number; kind?: "edge" | "center" | "grid" };

type Props = {
  blocks: Block[];
  selectedIds: string[];
  zoom: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  ctx?: unknown;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (update: (blocks: Block[]) => Block[], group?: string) => void;
  onDuplicate?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onAdvanced?: () => void;
  startEditingId?: string | null;
  onStartEditingHandled?: () => void;
};

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

type Interaction = {
  mode: "move" | "resize" | "rotate";
  ids: string[];
  pointerId: number;
  start: Point;
  originals: Record<string, Geometry>;
  bounds: Bounds;
  handle?: string;
  aspect: number;
  center: Point;
};

const MIN_SIZE = 24;
const MAX_SIZE = 2000;
const GRID_UNIT = 16;
const SAFE_MARGIN = 24;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function geometry(block: Block, index: number): Geometry {
  const resolved = resolveBlockGeometry(block, index);
  return {
    x: resolved.x,
    y: resolved.y,
    width: Math.min(MAX_SIZE, Math.max(MIN_SIZE, resolved.width)),
    height: Math.min(MAX_SIZE, Math.max(MIN_SIZE, resolved.height)),
    rotation: resolved.rotation,
    scale: resolved.scale,
    zIndex: resolved.zIndex,
  };
}

function rotatedBounds(value: Geometry): Bounds {
  const angle = value.rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const width = value.width * value.scale;
  const height = value.height * value.scale;
  const boundsWidth = width * cos + height * sin;
  const boundsHeight = width * sin + height * cos;
  const centerX = value.x + value.width / 2;
  const centerY = value.y + value.height / 2;
  return {
    left: centerX - boundsWidth / 2,
    top: centerY - boundsHeight / 2,
    right: centerX + boundsWidth / 2,
    bottom: centerY + boundsHeight / 2,
    width: boundsWidth,
    height: boundsHeight,
  };
}

function boundsOf(blocks: any[], selectedIds: string[]): Bounds | null {
  const selected = blocks
    .map((block, index) => ({ block, bounds: rotatedBounds(geometry(block, index)) }))
    .filter(({ block }) => selectedIds.includes(block.id));
  if (!selected.length) return null;
  const left = Math.min(...selected.map(({ bounds }) => bounds.left));
  const top = Math.min(...selected.map(({ bounds }) => bounds.top));
  const right = Math.max(...selected.map(({ bounds }) => bounds.right));
  const bottom = Math.max(...selected.map(({ bounds }) => bounds.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function pointerPoint(event: PointerEvent | React.PointerEvent, canvas: HTMLDivElement | null, zoom: number): Point {
  const rect = canvas?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  const scale = Math.max(0.01, zoom / 100);
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nearest(value: number, candidates: number[], threshold = 8) {
  let best = value;
  let distance = threshold + 1;
  for (const candidate of candidates) {
    const current = Math.abs(candidate - value);
    if (current <= threshold && current < distance) {
      best = candidate;
      distance = current;
    }
  }
  return best;
}

function resizeBounds(start: Interaction, point: Point, proportional: boolean, canvasWidth: number, canvasHeight: number) {
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
  if (proportional) {
    const ratio = start.aspect || 1;
    if (Math.abs(dx) >= Math.abs(dy)) height = Math.max(MIN_SIZE, Math.min(MAX_SIZE, width / ratio));
    else width = Math.max(MIN_SIZE, Math.min(MAX_SIZE, height * ratio));
    if (handle.includes("w")) left = right - width;
    else right = left + width;
    if (handle.includes("n")) top = bottom - height;
    else bottom = top + height;
  }

  if (handle.includes("w")) left = clamp(left, 0, Math.max(0, right - MIN_SIZE));
  if (handle.includes("e")) right = clamp(right, Math.min(canvasWidth, left + MIN_SIZE), canvasWidth);
  if (handle.includes("n")) top = clamp(top, 0, Math.max(0, bottom - MIN_SIZE));
  if (handle.includes("s")) bottom = clamp(bottom, Math.min(canvasHeight, top + MIN_SIZE), canvasHeight);

  width = Math.max(MIN_SIZE, Math.min(MAX_SIZE, right - left));
  height = Math.max(MIN_SIZE, Math.min(MAX_SIZE, bottom - top));
  return { left, top, width, height };
}

function cursorFor(handle: string) {
  if (handle === "rotate") return "crosshair";
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  return "nwse-resize";
}

function isTextInput(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable;
}

export function VisualTransformCanvas({ blocks, selectedIds: selectedIdsProp, zoom, canvasRef, ctx, onSelect, onChange, onDuplicate, onDelete, onAdvanced, startEditingId, onStartEditingHandled }: Props) {
  const interaction = useRef<Interaction | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const editingTextRef = useRef<HTMLTextAreaElement | null>(null);
  const groupMembers = (ids: string[]) => {
    const groups = new Set(
      blocks
        .filter((block: any) => ids.includes(block.id) && block.groupId)
        .map((block: any) => block.groupId),
    );
    return blocks
      .filter((block: any) => ids.includes(block.id) || (block.groupId && groups.has(block.groupId)))
      .map((block: any) => block.id);
  };
  const selectedIds = useMemo(() => groupMembers(selectedIdsProp), [blocks, selectedIdsProp]);
  const selectedBounds = useMemo(() => boundsOf(blocks, selectedIds), [blocks, selectedIds]);
  const selected = blocks.filter((block: any) => selectedIds.includes(block.id));

  const canvasSize = () => ({
    width: canvasRef.current?.clientWidth || 768,
    height: canvasRef.current?.clientHeight || 640,
  });

  const finish = () => {
    interaction.current = null;
    setGuides([]);
  };

  const startTextEditing = (block: Block) => {
    if (block.type !== "text" || block.locked || block.hidden || block.visibility === false) return;
    setEditingTextId(block.id);
    setEditingTextValue(block.props?.text ?? "");
  };

  const stopTextEditing = () => {
    setEditingTextId(null);
    setEditingTextValue("");
  };

  const updateEditingText = (value: string) => {
    if (!editingTextId) return;
    setEditingTextValue(value);
    onChange((items) => items.map((item) =>
      item.id === editingTextId
        ? { ...item, props: { ...item.props, text: value } }
        : item
    ), "text:edit");
  };

  useEffect(() => {
    if (!editingTextId) return;
    const frame = requestAnimationFrame(() => {
      editingTextRef.current?.focus();
      editingTextRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingTextId]);

  useEffect(() => {
    if (editingTextId && !blocks.some((block) => block.id === editingTextId && block.type === "text")) {
      stopTextEditing();
    }
  }, [blocks, editingTextId]);

  useEffect(() => {
    if (!startEditingId) return;
    const block = blocks.find((item) => item.id === startEditingId);
    if (block?.type === "text") startTextEditing(block);
    onStartEditingHandled?.();
  }, [startEditingId, blocks, onStartEditingHandled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedIds.length || isTextInput(event.target)) return;
      const activeText = selectedIds.length === 1
        ? blocks.find((block: any) => block.id === selectedIds[0])
        : undefined;
      if (event.key === "Enter" && activeText?.type === "text" && !activeText.locked) {
        event.preventDefault();
        startTextEditing(activeText);
        return;
      }

      const movable = blocks.filter((block: any) => selectedIds.includes(block.id) && !block.locked);
      if (!movable.length) return;
      if (event.key === "Escape") { finish(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        blocks.forEach((block: any) => onSelect(block.id, true));
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 } : event.key === "ArrowRight" ? { x: step, y: 0 } : event.key === "ArrowUp" ? { x: 0, y: -step } : event.key === "ArrowDown" ? { x: 0, y: step } : null;
      if (!delta) return;
      event.preventDefault();
      const size = canvasSize();
      onChange((items: any[]) => items.map((item: any) => {
        if (!selectedIds.includes(item.id) || item.locked) return item;
        const value = geometry(item, blocks.indexOf(item));
        const box = rotatedBounds(value);
        const nextX = clamp(value.x + delta.x, -box.left + value.x, size.width - (box.right - value.x));
        const nextY = clamp(value.y + delta.y, -box.top + value.y, size.height - (box.bottom - value.y));
        return { ...item, x: Math.round(nextX), y: Math.round(nextY) };
      }), "keyboard:move");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [blocks, selectedIds, onChange, onSelect]);

  const begin = (event: React.PointerEvent, mode: Interaction["mode"], handle?: string, block?: any) => {
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const requestedIds = block?.id ? selectedIds.includes(block.id) ? selectedIds : additive ? [...selectedIds, block.id] : [block.id] : selectedIds;
    const ids = requestedIds.filter((id) => !blocks.find((item: any) => item.id === id)?.locked);
    const activeBlocks = blocks.filter((item: any) => ids.includes(item.id));
    const bounds = boundsOf(blocks, ids);
    if (!ids.length || !activeBlocks.length || !bounds) return;
    const originals = Object.fromEntries(activeBlocks.map((item: any) => [item.id, geometry(item, blocks.indexOf(item))]));
    const point = pointerPoint(event, canvasRef.current, zoom);
    interaction.current = { mode, ids, pointerId: event.pointerId, start: point, originals, bounds, handle, aspect: bounds.width / Math.max(MIN_SIZE, bounds.height), center: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setGuides([]);
  };

  const move = (event: React.PointerEvent) => {
    const current = interaction.current;
    if (!current) return;
    event.stopPropagation();
    const point = pointerPoint(event, canvasRef.current, zoom);
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    const size = canvasSize();

    if (current.mode === "move") {
      let offsetX = dx;
      let offsetY = dy;
      const moved = { ...current.bounds, left: current.bounds.left + dx, right: current.bounds.right + dx, top: current.bounds.top + dy, bottom: current.bounds.bottom + dy };
      const others = blocks.filter((block: any) => !current.ids.includes(block.id));
      const nextGuides: Guide[] = [];
      if (event.shiftKey) {
        const xCandidates = [SAFE_MARGIN, size.width / 2, size.width - SAFE_MARGIN];
        const yCandidates = [SAFE_MARGIN, size.height / 2, size.height - SAFE_MARGIN];
        for (const other of others) {
          const box = rotatedBounds(geometry(other, blocks.indexOf(other)));
          xCandidates.push(box.left, box.right, (box.left + box.right) / 2);
          yCandidates.push(box.top, box.bottom, (box.top + box.bottom) / 2);
        }
        const snapX = nearest((moved.left + moved.right) / 2, xCandidates);
        const snapY = nearest((moved.top + moved.bottom) / 2, yCandidates);
        if (snapX !== (moved.left + moved.right) / 2) {
          offsetX += snapX - (moved.left + moved.right) / 2;
          nextGuides.push({ axis: "x", value: snapX, kind: "center" });
        }
        if (snapY !== (moved.top + moved.bottom) / 2) {
          offsetY += snapY - (moved.top + moved.bottom) / 2;
          nextGuides.push({ axis: "y", value: snapY, kind: "center" });
        }
        const gridX = Math.round((current.bounds.left + offsetX) / GRID_UNIT) * GRID_UNIT;
        const gridY = Math.round((current.bounds.top + offsetY) / GRID_UNIT) * GRID_UNIT;
        offsetX += gridX - (current.bounds.left + offsetX);
        offsetY += gridY - (current.bounds.top + offsetY);
        nextGuides.push({ axis: "x", value: gridX, kind: "grid" }, { axis: "y", value: gridY, kind: "grid" });
      }
      offsetX = clamp(offsetX, -current.bounds.left, size.width - current.bounds.right);
      offsetY = clamp(offsetY, -current.bounds.top, size.height - current.bounds.bottom);
      setGuides(nextGuides);
      onChange((items: any[]) => items.map((item: any) => {
        const original = current.originals[item.id];
        return original ? { ...item, x: Math.round(original.x + offsetX), y: Math.round(original.y + offsetY) } : item;
      }), "transform:move");
      return;
    }

    if (current.mode === "rotate") {
      const angle = Math.atan2(point.y - current.center.y, point.x - current.center.x) * 180 / Math.PI;
      const base = Math.atan2(current.start.y - current.center.y, current.start.x - current.center.x) * 180 / Math.PI;
      let delta = angle - base;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (event.shiftKey) delta = Math.round(delta / 15) * 15;
      const radians = delta * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      onChange((items: any[]) => items.map((item: any) => {
        const original = current.originals[item.id];
        if (!original) return item;
        const cx = original.x + original.width / 2;
        const cy = original.y + original.height / 2;
        const rotatedX = current.center.x + (cx - current.center.x) * cos - (cy - current.center.y) * sin;
        const rotatedY = current.center.y + (cx - current.center.x) * sin + (cy - current.center.y) * cos;
        return { ...item, x: Math.round(rotatedX - original.width / 2), y: Math.round(rotatedY - original.height / 2), rotation: original.rotation + delta };
      }), "transform:rotate");
      return;
    }

    const proportional = event.shiftKey || (current.ids.length === 1 && ["image", "gallery"].includes(blocks.find((block: any) => block.id === current.ids[0])?.type));
    const resized = resizeBounds(current, point, proportional, size.width, size.height);
    const sx = resized.width / Math.max(MIN_SIZE, current.bounds.width);
    const sy = resized.height / Math.max(MIN_SIZE, current.bounds.height);
    onChange((items: any[]) => items.map((item: any) => {
      const original = current.originals[item.id];
      if (!original) return item;
      return { ...item, x: Math.round(resized.left + (original.x - current.bounds.left) * sx), y: Math.round(resized.top + (original.y - current.bounds.top) * sy), width: Math.round(Math.max(MIN_SIZE, original.width * sx)), height: Math.round(Math.max(MIN_SIZE, original.height * sy)) };
    }), "transform:resize");
  };

  const end = (event?: React.PointerEvent) => { event?.stopPropagation(); finish(); };

  const selectedBlocks = blocks.filter((block: any) => selectedIds.includes(block.id));
  const updateSelectedProps = (key: string, value: string) => {
    if (!selectedBlocks.length) return;
    onChange((items: any[]) => items.map((item: any) => selectedIds.includes(item.id)
      ? { ...item, props: { ...item.props, [key]: value } }
      : item), `quick-toolbar:${key}`);
  };
  const duplicateSelected = () => {
    if (!selectedBlocks.length) return;
    if (onDuplicate) {
      onDuplicate(selectedIds);
      return;
    }
    const duplicatedGroupId = selectedBlocks.some((block: any) => block.groupId)
      ? `group-${Date.now()}-${Math.random().toString(36).slice(2)}`
      : undefined;
    const duplicated = selectedBlocks.map((block: any) => {
      const index = blocks.indexOf(block);
      const value = geometry(block, index);
      return {
        ...structuredClone(block),
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${block.id}-copy-${Date.now()}-${index}`,
        x: Math.round(value.x + 24),
        y: Math.round(value.y + 24),
        width: Math.round(value.width),
        height: Math.round(value.height),
        rotation: value.rotation,
        scale: value.scale,
        zIndex: value.zIndex + 1,
        ...(duplicatedGroupId ? { groupId: duplicatedGroupId } : { groupId: undefined }),
      };
    });
    onChange((items: any[]) => [...items, ...duplicated], "quick-toolbar:duplicate");
  };
  const deleteSelected = () => {
    if (!selectedBlocks.length) return;
    if (onDelete) {
      onDelete(selectedIds);
      return;
    }
    onChange((items: any[]) => items.filter((item: any) => !selectedIds.includes(item.id)), "quick-toolbar:delete");
    selectedIds.forEach((id) => onSelect(id, true));
  }; 
  const toggleLockSelected = () => {
    if (!selectedBlocks.length) return;
    const locked = selectedBlocks.some((block: any) => block.locked);
    onChange((items: any[]) => items.map((item: any) => selectedIds.includes(item.id)
      ? { ...item, locked: !locked }
      : item), "quick-toolbar:lock");
  };
  const imageAction = (action: ImageAction) => {
    const image = selectedBlocks.find((block: any) => block.type === "image");
    if (!image || selectedBlocks.length !== 1) return;
    if (action === "replace" || action === "crop" || action === "adjust") {
      onAdvanced?.();
    }
  };

  return <>
    {selectedBounds && selectedBlocks.length > 0 && (
      <div
        className="pointer-events-auto absolute z-[90] max-w-[calc(100%-1rem)] -translate-y-full pb-2"
        style={{ left: Math.max(8, selectedBounds.left), top: Math.max(8, selectedBounds.top) }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <EditorQuickToolbar
          selected={selectedBlocks}
          onProp={updateSelectedProps}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onAdvanced={() => onAdvanced?.()}
          onImage={imageAction}
          onLock={toggleLockSelected}
        />
      </div>
    )}
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: `${GRID_UNIT}px ${GRID_UNIT}px` }} />
    <div aria-hidden className="pointer-events-none absolute z-[5] border border-dashed border-amber-500/50" style={{ left: SAFE_MARGIN, top: SAFE_MARGIN, right: SAFE_MARGIN, bottom: SAFE_MARGIN }} />
    {guides.map((guide, index) => <div key={`${guide.axis}-${index}`} className={`pointer-events-none absolute z-[70] ${guide.kind === "grid" ? "border-amber-400/60" : "border-primary/70"}`} style={guide.axis === "x" ? { left: guide.value, top: 0, bottom: 0, borderLeftWidth: 1, borderLeftStyle: "dashed" } : { top: guide.value, left: 0, right: 0, borderTopWidth: 1, borderTopStyle: "dashed" }} />)}
    {blocks.map((block: any, index: number) => {
      const value = geometry(block, index);
      const isSelected = selectedIds.includes(block.id);
      const hidden = block.hidden === true || block.visibility === false;
      const isEditingText = editingTextId === block.id && block.type === "text";
      const hit = isSelected ? 10 : 6;
      return <div
        key={block.id || index}
        className={`group absolute left-0 top-0 rounded-xl ${isSelected ? "border-2 border-primary ring-2 ring-primary/30" : "border border-transparent hover:border-primary/40"} ${hidden ? "opacity-35" : ""}`}
        style={{
          width: value.width + hit * 2,
          height: value.height + hit * 2,
          transform: `translate(${value.x - hit}px, ${value.y - hit}px) rotate(${value.rotation}deg) scale(${value.scale})`,
          transformOrigin: "center",
          zIndex: value.zIndex,
          touchAction: "none",
          pointerEvents: hidden ? "none" : "auto",
          padding: hit,
          boxSizing: "border-box",
        }}
        onPointerDown={(event) => {
          if (hidden || block.locked) return;
          const additive = event.shiftKey || event.ctrlKey || event.metaKey;
          const memberIds = block.groupId
            ? blocks.filter((item: any) => item.groupId === block.groupId).map((item: any) => item.id)
            : [block.id];
          onSelect(block.id, additive);
          if (!additive) {
            memberIds.slice(1).forEach((id) => onSelect(id, true));
          }
          begin(event, "move", undefined, block);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClick={(event) => {
          event.stopPropagation();
          const additive = event.shiftKey || event.ctrlKey || event.metaKey;
          const memberIds = block.groupId
            ? blocks.filter((item: any) => item.groupId === block.groupId).map((item: any) => item.id)
            : [block.id];
          onSelect(block.id, additive);
          if (!additive) {
            memberIds.slice(1).forEach((id) => onSelect(id, true));
          }
        }}
        onDoubleClick={(event) => {
          if (block.type !== "text" || block.locked) return;
          event.preventDefault();
          event.stopPropagation();
          startTextEditing(block);
        }}
      >
        <div className="pointer-events-none h-full w-full rounded-lg">
          <BlockView block={block} ctx={ctx as any} interactive={false} index={index} />
        </div>
        {isEditingText && (
          <textarea
            ref={editingTextRef}
            value={editingTextValue}
            aria-label="Editar texto do convite"
            className="absolute z-[100] resize-none overflow-hidden rounded-md border-2 border-primary bg-background/95 px-2 py-1.5 text-foreground shadow-lg outline-none"
            style={{
              left: hit,
              top: hit,
              width: value.width,
              height: value.height,
              fontFamily: fontCss(block.props?.font),
              fontSize: Number(block.props?.fontSize) > 0 ? `${Number(block.props.fontSize)}px` : undefined,
              fontWeight: block.props?.fontWeight || (block.props?.bold === "1" ? "700" : "normal"),
              fontStyle: block.props?.fontStyle || "normal",
              textDecoration: block.props?.textDecoration || "none",
              letterSpacing: Number.isFinite(Number(block.props?.letterSpacing)) ? `${Number(block.props.letterSpacing)}px` : undefined,
              lineHeight: Number(block.props?.lineHeight) > 0 ? Number(block.props.lineHeight) : undefined,
              textAlign: block.props?.align || "center",
              color: block.props?.color || undefined,
              textTransform: block.props?.textTransform || undefined,
              whiteSpace: "pre-wrap",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateEditingText(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && event.key === "Enter")) {
                event.preventDefault();
                stopTextEditing();
              }
            }}
            onBlur={stopTextEditing}
          />
        )}
        {isSelected && !isEditingText && <div className="pointer-events-none absolute -top-7 left-0 max-w-full truncate rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">{block.type === "text" ? "Duplo clique para editar" : String(block.type)}</div>}
      </div>;
    })}
    {selectedBounds && <div className="pointer-events-none absolute z-[80] border-2 border-primary" style={{ left: selectedBounds.left, top: selectedBounds.top, width: selectedBounds.width, height: selectedBounds.height }}>
      {selected.length === 1 && !selected[0]?.locked && <button type="button" aria-label="Girar seleção" className="pointer-events-auto absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 -translate-y-9 rounded-full border-2 border-background bg-primary shadow-sm" style={{ cursor: cursorFor("rotate"), touchAction: "none" }} onPointerDown={(event) => begin(event, "rotate")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />}
      {HANDLES.map((handle) => {
        const position = {
          nw: "-left-3 -top-3", n: "left-1/2 -top-3 -translate-x-1/2",
          ne: "-right-3 -top-3", e: "-right-3 top-1/2 -translate-y-1/2",
          se: "-bottom-3 -right-3", s: "-bottom-3 left-1/2 -translate-x-1/2",
          sw: "-bottom-3 -left-3", w: "-left-3 top-1/2 -translate-y-1/2"
        }[handle];
        return <button key={handle} type="button" aria-label={`Redimensionar ${handle}`} disabled={selected.some((item: any) => item.locked)}
          className={`pointer-events-auto absolute h-6 w-6 rounded-full border-2 border-background bg-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${position}`}
          style={{ cursor: cursorFor(handle), touchAction: "none" }}
          onPointerDown={(event) => begin(event, "resize", handle)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />;
      })}
      {selected.length > 1 && <span className="absolute -top-7 left-0 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">{selected.length} elementos</span>}
    </div>}
  </>;
}
