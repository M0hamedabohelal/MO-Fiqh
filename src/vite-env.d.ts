/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }
  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}

declare module 'html-to-image' {
  export function toPng(
    node: HTMLElement,
    options?: Record<string, unknown>,
  ): Promise<string>;
}
