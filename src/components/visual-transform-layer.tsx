import { Component, type ErrorInfo, type ReactNode } from "react";

type Block = import("@/lib/templates").Block;

export type VisualTransformLayerProps = {
  root: HTMLDivElement | null;
  blocks: Block[];
  selectedIds: string[];
  zoom: number;
  onChange: (update: (blocks: Block[]) => Block[]) => void;
};

export class VisualTransformErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[VisualTransformLayer] Erro na camada de transformação", {
      message: error?.message ?? String(error),
      stack: error?.stack ?? "",
      componentStack: info.componentStack ?? "",
      error,
    });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-destructive/40 bg-background/95 px-4 py-3 text-sm shadow-lg" role="status">
        <p className="font-medium text-destructive">Camada de transformação indisponível</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {this.state.error.message || "Erro inesperado na camada de transformação."}
        </p>
      </div>
    );
  }
}

export function VisualTransformLayer(_props: VisualTransformLayerProps) {
  return null;
}
