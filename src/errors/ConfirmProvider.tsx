import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ConfirmContext } from './confirmContext';
import type { ConfirmApi, ConfirmOptions } from './confirmContext';
import './confirm-dialog.css';

// ─── بديل window.confirm ───
// window.confirm يجمّد الصفحة، بلا RTL ولا ثيم، ولا يمكن اختباره آليًا.
// هذا الحوار يثبّت التركيز (focus trap)، يُغلق بـEscape/النقر على الخلفية،
// ويعيد «تأكيد/إلغاء» عبر Promise — فالاستدعاء يبقى بسطر واحد في المواضع الحالية.

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback((ok: boolean) => {
    // الحل داخل مُحدِّث الحالة: يضمن أن تُحلّ الوعود مرة واحدة فقط حتى مع نقرتين سريعتين
    setPending((current) => {
      current?.resolve(ok);
      return null;
    });
  }, []);

  useFocusTrap(dialogRef, Boolean(pending), () => close(false));

  const api = useMemo<ConfirmApi>(() => ({
    confirm: (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
  }), []);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {pending && typeof document !== 'undefined' && createPortal(
        <div className="confirm-backdrop" onClick={() => close(false)}>
          <div
            ref={dialogRef}
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.message ? 'confirm-message' : undefined}
            dir="rtl"
            lang="ar"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="confirm-title">{pending.title}</h2>
            {pending.message && <div id="confirm-message" className="confirm-message">{pending.message}</div>}
            <div className="confirm-actions">
              <button
                type="button"
                className={`btn btn-sm ${pending.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? 'تأكيد'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => close(false)}
              >
                {pending.cancelLabel ?? 'إلغاء'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ConfirmContext.Provider>
  );
}

