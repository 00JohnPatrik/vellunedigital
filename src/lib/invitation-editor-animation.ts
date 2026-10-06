export type AnimationTrigger = "on_load" | "on_scroll" | "on_hover" | "on_click";
export type AnimationDirection = "in" | "out";
export type AnimationPreset = "fade" | "slide_up" | "slide_down" | "slide_left" | "slide_right" | "zoom" | "blur" | "float" | "pulse";

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
};

const numberInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
};

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
    delay: numberInRange(source.delay, 0, 0, MAX_ANIMATION_DELAY),
    stagger: numberInRange(source.stagger, 0, 0, 1000),
    parallax: numberInRange(source.parallax, 0, -MAX_PARALLAX, MAX_PARALLAX),
    depth: numberInRange(source.depth, 0, -MAX_DEPTH, MAX_DEPTH),
    enabled: source.enabled !== false,
  };
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
    willChange: "transform, opacity, filter",
  } as Record<string, string | number>;
}

export function parallaxStyle(animationValue: unknown, offset: { x: number; y: number }, enabled: boolean) {
  const animation = normalizeAnimation(animationValue);
  if (!enabled || !animation.parallax) return {};
  return {
    "--vellune-parallax-x": `${offset.x * animation.parallax / MAX_PARALLAX}px`,
    "--vellune-parallax-y": `${offset.y * animation.parallax / MAX_PARALLAX}px`,
    "--vellune-parallax-z": `${animation.depth}px`,
  } as Record<string, string>;
}
