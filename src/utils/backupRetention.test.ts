import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readdirSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyRetentionPolicy } from '../../scripts/backup-retention.mjs';

describe('applyRetentionPolicy', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-backups-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('يعيد 0 عندما يكون المجلد فارغًا', () => {
    const res = applyRetentionPolicy(testDir);
    expect(res.pruned).toBe(0);
    expect(res.retained).toBe(0);
  });

  it('يحتفظ بجميع النسخ إذا كان عددها أقل من الحد الأقصى', () => {
    writeFileSync(join(testDir, 'firestore-backup-1.json'), '{}');
    writeFileSync(join(testDir, 'firestore-backup-2.json'), '{}');
    writeFileSync(join(testDir, 'lessons-local-1.json'), '{}');

    const res = applyRetentionPolicy(testDir, { maxFiles: 5, maxAgeDays: 30 });
    expect(res.pruned).toBe(0);
    expect(res.retained).toBe(3);
    expect(readdirSync(testDir).length).toBe(3);
  });

  it('يحذف النسخ الزائدة عن الحد الأقصى مع الاحتفاظ بالأحدث', () => {
    // إنشاء 6 ملفات firestore مع تواريخ مختلفة
    const now = Date.now();
    for (let i = 1; i <= 6; i++) {
      const p = join(testDir, `firestore-backup-${i}.json`);
      writeFileSync(p, `content ${i}`);
      // تعديل وقت التعديل ليكون i أحدث من i-1
      const time = (now - (10 - i) * 1000) / 1000;
      utimesSync(p, time, time);
    }

    // نحدد الحد الأقصى بـ 3
    const res = applyRetentionPolicy(testDir, { maxFiles: 3, maxAgeDays: 30 });
    expect(res.pruned).toBe(3);
    expect(res.retained).toBe(3);

    const remaining = readdirSync(testDir);
    expect(remaining.length).toBe(3);
    // الأحدث هم 4 و 5 و 6
    expect(remaining).toContain('firestore-backup-6.json');
    expect(remaining).toContain('firestore-backup-5.json');
    expect(remaining).toContain('firestore-backup-4.json');
  });
});
