import {
  GraphNode,
  AssumptionNode,
  NodeHistoryEvent,
  HistoryAction
} from './types';

/**
 * Creates a normalized NodeHistoryEvent with an ISO 8601 timestamp.
 */
export function createHistoryEvent(
  action: HistoryAction,
  details?: {
    from?: string;
    to?: string;
    note?: string;
    evidence?: string;
    author?: string;
    at?: string;
  }
): NodeHistoryEvent {
  return {
    at: details?.at || new Date().toISOString(),
    action,
    from: details?.from,
    to: details?.to,
    note: details?.note,
    evidence: details?.evidence,
    author: details?.author || 'Người dùng'
  };
}

/**
 * Appends a history event to a node immutably.
 * If the node has no existing history array, it initializes one.
 */
export function appendNodeHistory<T extends GraphNode>(
  node: T,
  event: NodeHistoryEvent
): T {
  const existingHistory = node.history ? [...node.history] : [];
  return {
    ...node,
    history: [...existingHistory, event]
  };
}

/**
 * Records a status change for any node (especially assumptions), updating its status
 * and appending a structured history record.
 */
export function recordStatusChange<T extends GraphNode>(
  node: T,
  toStatus: string,
  options?: {
    note?: string;
    evidence?: string;
    author?: string;
    at?: string;
  }
): T {
  const currentStatus = (node as any).status;
  const isRefuted = toStatus === 'refuted';
  const isValidated = toStatus === 'validated';

  const action: HistoryAction = isRefuted
    ? 'refuted'
    : isValidated
    ? 'validated'
    : 'status_change';

  const event = createHistoryEvent(action, {
    from: currentStatus,
    to: toStatus,
    note: options?.note,
    evidence: options?.evidence,
    author: options?.author,
    at: options?.at
  });

  const updatedNode: any = {
    ...node,
    status: toStatus
  };

  if (node.type === 'assumption') {
    if (isRefuted) {
      updatedNode.refuteReason = options?.note || 'Bị bác bỏ bởi dữ liệu thực tế';
    } else if (isValidated) {
      delete updatedNode.refuteReason;
    }
  }

  return appendNodeHistory(updatedNode as T, event);
}

/**
 * Records an evidence link or empirical note for a node, updating evidence fields
 * and appending an 'evidence_added' event to its history.
 */
export function recordEvidence<T extends GraphNode>(
  node: T,
  evidence: string,
  note?: string,
  author?: string,
  at?: string
): T {
  const event = createHistoryEvent('evidence_added', {
    evidence,
    note: note || 'Bổ sung liên kết / bằng chứng kiểm chứng',
    author,
    at
  });

  const isUrl = /^https?:\/\//i.test(evidence.trim());

  const updatedNode: T = {
    ...node,
    evidenceUrl: isUrl ? evidence.trim() : node.evidenceUrl,
    evidenceNotes: !isUrl ? evidence.trim() : (note || node.evidenceNotes)
  };

  return appendNodeHistory(updatedNode, event);
}

/**
 * Checks whether a node is an unverified assumption that has passed its verifyBy deadline.
 */
export function isNodeOverdue(node: GraphNode, now: Date = new Date()): boolean {
  if (node.type !== 'assumption') return false;
  const assumption = node as AssumptionNode;
  if (assumption.status !== 'unverified' || !assumption.verifyBy) return false;

  const targetDate = new Date(assumption.verifyBy);
  if (isNaN(targetDate.getTime())) return false;

  // Overdue if the verifyBy date is earlier than today's date (ignoring hours)
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  return targetDateOnly.getTime() < nowDateOnly.getTime();
}

/**
 * Returns all unverified assumptions that are overdue, ordered by verifyBy ascending (earliest first).
 */
export function getOverdueAssumptions(
  nodes: GraphNode[],
  now: Date = new Date()
): AssumptionNode[] {
  return nodes
    .filter((n): n is AssumptionNode => n.type === 'assumption' && isNodeOverdue(n, now))
    .sort((a, b) => {
      const dateA = new Date(a.verifyBy || 0).getTime();
      const dateB = new Date(b.verifyBy || 0).getTime();
      return dateA - dateB;
    });
}

/**
 * Retrieves the history of a node, sorted chronologically with newest first.
 */
export function getFormattedHistory(node: GraphNode): NodeHistoryEvent[] {
  if (!node.history || node.history.length === 0) return [];
  return [...node.history].sort((a, b) => {
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
}

