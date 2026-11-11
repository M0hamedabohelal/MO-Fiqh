import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIncidentId, isValidIncidentId, recordIncident, readIncidentRing, readLastIncident } from './incident';

describe('incident ids', () => {
  it('النمط err_ + 8 hex', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(createIncidentId()).toMatch(/^err_[0-9a-f]{8}$/);
    }
  });

  it('التحقق يرفض كل ما ليس بالصيغة', () => {
    expect(isValidIncidentId('err_3f9a1c2b')).toBe(true);
    expect(isValidIncidentId('ERR_3f9a1c2b')).toBe(false);
    expect(isValidIncidentId('err_xyz')).toBe(false);
    expect(isValidIncidentId(null)).toBe(false);
    expect(isValidIncidentId(12)).toBe(false);
  });
});

describe('incident ring buffer', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('يسجّل آخر حادثة وتُقرأ', () => {
    recordIncident({ id: 'err_00000001', kind: 'network', scope: 'test', message: 'boom' });
    const last = readLastIncident();
    expect(last?.id).toBe('err_00000001');
    expect(last?.kind).toBe('network');
    expect(typeof last?.at).toBe('number');
  });

  it('لا يتجاوز 30 حدثًا (الأقدم يُطرَح)', () => {
    for (let i = 0; i < 35; i += 1) {
      recordIncident({ id: `err_${String(i).padStart(8, '0')}`, kind: 'unknown', scope: 's', message: `m${i}` });
    }
    const ring = readIncidentRing();
    expect(ring).toHaveLength(30);
    expect(ring[0].message).toBe('m5');
    expect(ring[29].message).toBe('m34');
  });

  it('sessionStorage مكسور لا يكسر التطبيق', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => recordIncident({ id: 'err_0000000a', kind: 'unknown', scope: 's', message: 'm' })).not.toThrow();
    expect(readIncidentRing()).toEqual([]);
  });
});
