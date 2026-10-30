import { describe, it, expect } from 'vitest';
import {
  createHistoryEvent,
  appendNodeHistory,
  recordStatusChange,
  recordEvidence,
  isNodeOverdue,
  getOverdueAssumptions,
  getFormattedHistory
} from './history';
import { AssumptionNode, DecisionNode } from './types';
import seedData from '../../data/demo/seed.json';

describe('History & Evidence (Phase 9)', () => {
  const baseAssumption: AssumptionNode = {
    id: 'A1',
    type: 'assumption',
    text: 'Nhà bán lẻ chấp nhận mức phí dịch vụ 1.2%',
    status: 'unverified',
    importance: 5,
    confidence: 0.5,
    verifyBy: '2026-11-01'
  };

  const baseDecision: DecisionNode = {
    id: 'D1',
    type: 'decision',
    text: 'Chọn mô hình đối soát T+1',
    status: 'active',
    effortWeeks: 4
  };

  it('creates history event with valid fields and default timestamp', () => {
    const event = createHistoryEvent('created', { note: 'Khởi tạo giả định' });
    expect(event.action).toBe('created');
    expect(event.note).toBe('Khởi tạo giả định');
    expect(event.author).toBe('Người dùng');
    expect(new Date(event.at).getTime()).toBeGreaterThan(0);
  });

  it('appends history immutably on node without existing history', () => {
    const event = createHistoryEvent('created', { note: 'Initial' });
    const updated = appendNodeHistory(baseAssumption, event);

    expect(baseAssumption.history).toBeUndefined(); // Original untouched
    expect(updated.history).toHaveLength(1);
    expect(updated.history?.[0].action).toBe('created');
  });

  it('records status change to refuted with reason and history event', () => {
    const refuted = recordStatusChange(baseAssumption, 'refuted', {
      note: 'Dữ liệu A/B test tuần 4 cho thấy tỷ lệ churn tăng 15%',
      author: 'Lead PM'
    });

    expect(refuted.status).toBe('refuted');
    expect(refuted.refuteReason).toBe('Dữ liệu A/B test tuần 4 cho thấy tỷ lệ churn tăng 15%');
    expect(refuted.history).toHaveLength(1);
    expect(refuted.history?.[0].action).toBe('refuted');
    expect(refuted.history?.[0].from).toBe('unverified');
    expect(refuted.history?.[0].to).toBe('refuted');
    expect(refuted.history?.[0].author).toBe('Lead PM');
  });

  it('records status change to validated and clears refuteReason if previously refuted', () => {
    const refuted = recordStatusChange(baseAssumption, 'refuted', { note: 'Khảo sát sơ bộ' });
    const reValidated = recordStatusChange(refuted, 'validated', {
      note: 'Đối tác ký hợp đồng biểu phí 1.2%'
    });

    expect(reValidated.status).toBe('validated');
    expect(reValidated.refuteReason).toBeUndefined();
    expect(reValidated.history).toHaveLength(2);
    expect(reValidated.history?.[1].action).toBe('validated');
  });

  it('records evidence link and empirical notes correctly', () => {
    const withUrl = recordEvidence(
      baseAssumption,
      'https://jira.example.com/browse/EXP-102',
      'Kết quả thử nghiệm định giá'
    );
    expect(withUrl.evidenceUrl).toBe('https://jira.example.com/browse/EXP-102');
    expect(withUrl.history).toHaveLength(1);
    expect(withUrl.history?.[0].action).toBe('evidence_added');
    expect(withUrl.history?.[0].evidence).toBe('https://jira.example.com/browse/EXP-102');

    const withNotes = recordEvidence(
      baseAssumption,
      'Đã phỏng vấn 15 merchants tại chợ Đồng Xuân, 14/15 đồng ý mức phí 1.2%'
    );
    expect(withNotes.evidenceNotes).toBe('Đã phỏng vấn 15 merchants tại chợ Đồng Xuân, 14/15 đồng ý mức phí 1.2%');
    expect(withNotes.history).toHaveLength(1);
  });

  describe('Overdue checks', () => {
    const pastDate = new Date('2026-10-15');
    const futureDate = new Date('2026-11-15');

    it('identifies overdue unverified assumption correctly', () => {
      // verifyBy is 2026-11-01
      expect(isNodeOverdue(baseAssumption, pastDate)).toBe(false);
      expect(isNodeOverdue(baseAssumption, futureDate)).toBe(true);
    });

    it('returns false for validated or refuted assumptions even if date passed', () => {
      const validated: AssumptionNode = { ...baseAssumption, status: 'validated' };
      const refuted: AssumptionNode = { ...baseAssumption, status: 'refuted' };

      expect(isNodeOverdue(validated, futureDate)).toBe(false);
      expect(isNodeOverdue(refuted, futureDate)).toBe(false);
    });

    it('returns false for decisions and tasks', () => {
      expect(isNodeOverdue(baseDecision, futureDate)).toBe(false);
    });

    it('filters and sorts overdue assumptions correctly', () => {
      const aEarly: AssumptionNode = {
        ...baseAssumption,
        id: 'A_EARLY',
        verifyBy: '2026-10-20'
      };
      const aLate: AssumptionNode = {
        ...baseAssumption,
        id: 'A_LATE',
        verifyBy: '2026-10-25'
      };
      const aFuture: AssumptionNode = {
        ...baseAssumption,
        id: 'A_FUTURE',
        verifyBy: '2026-12-01'
      };

      const overdue = getOverdueAssumptions([aFuture, aLate, aEarly], futureDate);
      expect(overdue.map((a) => a.id)).toEqual(['A_EARLY', 'A_LATE']);
    });
  });

  it('sorts formatted history chronologically newest first', () => {
    let node = appendNodeHistory(
      baseAssumption,
      createHistoryEvent('created', { at: '2026-10-01T10:00:00Z', note: 'Created' })
    );
    node = appendNodeHistory(
      node,
      createHistoryEvent('status_change', { at: '2026-10-05T10:00:00Z', note: 'Changed' })
    );
    node = appendNodeHistory(
      node,
      createHistoryEvent('refuted', { at: '2026-10-03T10:00:00Z', note: 'Refuted earlier' })
    );

    const history = getFormattedHistory(node);
    expect(history.map((h) => h.note)).toEqual(['Changed', 'Refuted earlier', 'Created']);
  });

  it('runs seamlessly on seed.json without breaking legacy nodes lacking history', () => {
    const seedNodes = seedData.nodes as AssumptionNode[];
    expect(seedNodes.length).toBeGreaterThan(0);

    for (const node of seedNodes) {
      expect(node.history).toBeUndefined();
      const formatted = getFormattedHistory(node);
      expect(formatted).toEqual([]);

      // Should be able to append history on seed node without mutation
      const updated = appendNodeHistory(
        node,
        createHistoryEvent('edited', { note: 'Seed test' })
      );
      expect(updated.history).toHaveLength(1);
      expect(node.history).toBeUndefined();
    }
  });
});
