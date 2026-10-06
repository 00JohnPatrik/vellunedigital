import { useEffect, useState } from "react";

export type AnimationTrigger = "on_load" | "on_scroll" | "on_hover" | "on_click";
export type AnimationDirection = "in" | "out";
export type AnimationPreset = "fade" | "slide_up" | "slide_down" | "slide_left" | "slide_right" | "zoom" | "blur" | "float" | "pulse";
export type AnimationKeyframe = {
  offset: number;
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  blur?: number;
  rotate?: number;
};

export type EditorAnimation = {
  preset: AnimationPreset;
  direction: AnimationDirection;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  stagger: number;
  iterations: number | "infinite";
  easing: string;
  enabled: boolean;
  parallax: number;
  depth: number;
  sensor: boolean;
  keyframes?: AnimationKeyframe[];
};

export const ANIMATION_FEATURE_FLAG = true;
export const MAX_ANIMATION_DURATION = 4000;
export const MAX_ANIMATION_DELAY = 3000;
export const MAX_PARALLAX = 32;
export const MAX_DEPTH = 12;

export const ANIMATION_PRESETS: Array<{ value: AnimationPreset; label: string; description: string }> = [
  { value: "fade", label: "Dissolver", description: "Entrada suave com transparência" },
  { value: "slide_up", label: "Subir", description: "Entra de baixo para cima" },
  { value: "slide_down", label: "Descer", description: "Entra de cima para baixo" },
  { value: "slide_left", label: "Deslizar para esquerda", description: "Entra pela direita" },
  { value: "slide_right", label: "Deslizar para direita", description: "Entra pela esquerda" },
  { value: "zoom", label: "Zoom", description: "Aproxima suavemente" },
  { value: "blur", label: "Desfoque", description: "Revela o elemento gradualmente" },
  { value: "float", label: "Flutuar", description: "Movimento contínuo sutil" },
  { value: "pulse", label: "Pulso", description: "Destaque contínuo discreto" },
];

export const DEFAULT_ANIMATION: EditorAnimation = {
  preset: "fade",
  direction: "in",
  trigger: "on_load",
  duration: 650,
  delay: 0,
  stagger: 0,
  iterations: 1,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  enabled: true,
  parallax: 0,
  depth: 0,
  sensor: false,
};

const numberInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
};

function normalizeKeyframes(value: unknown): AnimationKeyframe[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const frames = value
    .filter((frame) => frame && typeof frame === "object")
    .map((frame) => {
      const source = frame as Record<string, unknown>;
      return {
        offset: numberInRange(source.offset, 0, 0, 1),
        ...(typeof source.opacity === "number" ? { opacity: numberInRange(source.opacity, 1, 0, 1) } : {}),
        ...(typeof source.x === "number" ? { x: numberInRange(source.x, 0, -200, 200) } : {}),
        ...(typeof source.y === "number" ? { y: numberInRange(source.y, 0, -200, 200) } : {}),
        ...(typeof source.scale === "number" ? { scale: numberInRange(source.scale, 1, 0.1, 3) } : {}),
        ...(typeof source.blur === "number" ? { blur: numberInRange(source.blur, 0, 0, 40) } : {}),
        ...(typeof source.rotate === "number" ? { rotate: numberInRange(source.rotate, 0, -360, 360) } : {}),
      };
    })
    .sort((a, b) => a.offset - b.offset)
    .slice(0, 12);
  return frames.length >= 2 ? frames : undefined;
}

export function normalizeAnimation(value: unknown): EditorAnimation {
  const source = value && typeof value === "object" ? value as Partial<EditorAnimation> : {};
  const preset = ANIMATION_PRESETS.some((item) => item.value === source.preset) ? source.preset! : DEFAULT_ANIMATION.preset;
  const trigger = ["on_load", "on_scroll", "on_hover", "on_click"].includes(String(source.trigger)) ? source.trigger! : DEFAULT_ANIMATION.trigger;
  const direction = source.direction === "out" ? "out" : "in";
  const iterations = source.iterations === "infinite" ? "infinite" : numberInRange(source.iterations, 1, 1, 4);
  return {
    ...DEFAULT_ANIMATION,
    ...source,
    preset,
    trigger,
    direction,
    iterations,
    duration: numberInRange(source.duration, DEFAULT_ANIMATION.duration, 100, MAX_ANIMATION_DURATION),
    delay: numberInRange(source.delay, DEFAULT_ANIMATION.delay, 0, MAX_ANIMATION_DELAY),
    stagger: numberInRange(source.stagger, DEFAULT_ANIMATION.stagger, 0, 1000),
    parallax: numberInRange(source.parallax, DEFAULT_ANIMATION.parallax, -MAX_PARALLAX, MAX_PARALLAX),
    depth: numberInRange(source.depth, DEFAULT_ANIMATION.depth, -MAX_DEPTH, MAX_DEPTH),
    enabled: source.enabled !== false,
    sensor: source.sensor === true,
    keyframes: normalizeKeyframes(source.keyframes),
  };
}

type MotionOffset = { x: number; y: number };
type MotionSubscriber = (offset: MotionOffset) => void;
const subscribers = new Set<MotionSubscriber>();
let motionOffset: MotionOffset = { x: 0, y: 0 };
let frame: number | null = null;
let listening = false;
let sensorListening = false;
let sensorEnabled = false;

function publishMotion(offset: MotionOffset) {
  motionOffset = { x: numberInRange(offset.x, 0, -1, 1), y: numberInRange(offset.y, 0, -1, 1) };
  if (frame !== null || typeof window === "undefined") return;
  frame = window.requestAnimationFrame(() => {
    frame = null;
    subscribers.forEach((subscriber) => subscriber(motionOffset));
  });
}

function onPointerMove(event: PointerEvent) {
  publishMotion({
    x: (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
    y: (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
  });
}

function onDeviceOrientation(event: DeviceOrientationEvent) {
  if (!sensorEnabled) return;
  publishMotion({ x: numberInRange((event.gamma ?? 0) / 45, 0, -1, 1), y: numberInRange((event.beta ?? 0) / 45, 0, -1, 1) });
}

function ensureMotionListeners() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointermove", onPointerMove, { passive: true });
}

function stopMotionListeners() {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("pointermove", onPointerMove);
  if (sensorListening) {
    window.removeEventListener("deviceorientation", onDeviceOrientation);
    sensorListening = false;
  }
}

export function subscribeMotion(subscriber: MotionSubscriber) {
  subscribers.add(subscriber);
  ensureMotionListeners();
  subscriber(motionOffset);
  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size) stopMotionListeners();
  };
}

export async function requestMotionPermission() {
  if (typeof window === "undefined") return false;
  const Orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> };
  if (typeof Orientation.requestPermission === "function") {
    try {
      const result = await Orientation.requestPermission();
      if (result !== "granted") return false;
    } catch {
      return false;
    }
  }
  sensorEnabled = true;
  ensureMotionListeners();
  if (!sensorListening) {
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
    sensorListening = true;
  }
  return true;
}

export function animationStyle(animationValue: unknown, options: { playing: boolean; selected: boolean; reducedMotion: boolean; index?: number }) {
  const animation = normalizeAnimation(animationValue);
  const active = ANIMATION_FEATURE_FLAG && animation.enabled && options.playing && !options.selected && !options.reducedMotion;
  if (!active) return { willChange: "auto" } as Record<string, string | number>;
  return {
    animationName: `vellune-${animation.preset}-${animation.direction}`,
    animationDuration: `${animation.duration}ms`,
    animationDelay: `${animation.delay + (options.index ?? 0) * animation.stagger}ms`,
    animationTimingFunction: animation.easing,
    animationIterationCount: animation.iterations,
    animationFillMode: "both",
    animationPlayState: "running",
    willChange: "transform, opacity, filter",
  } as Record<string, string | number>;
}

export function parallaxStyle(animationValue: unknown, offset: MotionOffset, enabled: boolean) {
  const animation = normalizeAnimation(animationValue);
  if (!enabled || !animation.parallax) return {};
  return {
    "--vellune-parallax-x": `${offset.x * animation.parallax}px`,
    "--vellune-parallax-y": `${offset.y * animation.parallax}px`,
    "--vellune-parallax-z": `${animation.depth}px`,
    transform: `translate3d(var(--vellune-parallax-x), var(--vellune-parallax-y), var(--vellune-parallax-z))`,
  } as Record<string, string>;
}

export function useMotionOffset(enabled: boolean) {
  const [offset, setOffset] = useState<MotionOffset>(motionOffset);
  useEffect(() => enabled ? subscribeMotion(setOffset) : undefined, [enabled]);
  return offset;
}
