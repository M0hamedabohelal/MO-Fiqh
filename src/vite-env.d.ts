/// <reference types="vite/client" />

declare module 'html-to-image' {
  export function toPng(
    node: HTMLElement,
    options?: Record<string, unknown>,
  ): Promise<string>;
}

declare module '*scripts/backup-retention.mjs' {
  export interface RetentionOptions {
    maxFiles?: number;
    maxAgeDays?: number;
  }
  export interface RetentionResult {
    pruned: number;
    retained: number;
  }
  export function applyRetentionPolicy(
    dir: string,
    options?: RetentionOptions,
  ): RetentionResult;
}
