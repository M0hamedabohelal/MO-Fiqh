// @vitest-environment jsdom
// عزل: useLibrarySync بلا مستخدم — لا يمسّ السحابة إطلاقًا.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const getDoc = vi.fn(async () => ({ exists: () => false, data: () => ({}) }));
const setDoc = vi.fn(async () => {});

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...p: string[]) => ({ path: p.join('/') }),
  getDoc: (...a: unknown[]) => getDoc(...(a as [])),
  setDoc: (...a: unknown[]) => setDoc(...(a as [])),
}));
vi.mock('../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: async () => ({ db: { __db: true }, fsMod: {} }),
}));
vi.mock('../Components/Auth/AuthContext', () => ({
  useAuth: () => ({ user: null, authLoading: false }),
}));
vi.mock('../utils/logError', () => ({ logError: vi.fn() }));

import { useLibrarySync } from './useLibrarySync';

describe('useLibrarySync — زائر', () => {
  beforeEach(() => {
    getDoc.mockClear();
    setDoc.mockClear();
  });

  it('بلا مستخدم لا سحب ولا دفع', async () => {
    renderHook(() => useLibrarySync({
      ready: true,
      data: { bookmarks: ['1'], highlights: [], notes: {}, readLessons: [], stopMarks: {}, theme: 'dark' },
      onMerged: vi.fn(),
    }));

    await new Promise((r) => setTimeout(r, 1500));
    expect(getDoc).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  }, 8000);
});
