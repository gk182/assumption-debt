import { GraphNode, GraphEdge, AssumptionNode, NodeType } from './types';
import { downstream, effortAtRisk, riskScore, getNodeMap } from './graph';

export type TaskType = 'verification' | 'review';
export type TaskActionStatus = 'proposed' | 'approved' | 'rejected';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface GeneratedTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  targetNodeId: string;
  targetNodeType: NodeType;
  status: TaskActionStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  suggestedAssignee: string;
  riskScore?: number;
  effortWeeksAtRisk?: number;
  actionableSteps: string[];
  createdAt: string;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds N days to a Date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generates verification tasks for the top unverified assumptions ordered by estimated riskScore.
 * Adheres to principle: proposed by system, human approves/rejects before creation.
 */
export function generateVerificationTasks(
  nodes: GraphNode[],
  edges: GraphEdge[],
  topN: number = 3,
  baseDate: Date = new Date()
): GeneratedTask[] {
  const nodeMap = getNodeMap(nodes);
  const assumptions = nodes.filter(
    (n): n is AssumptionNode => n.type === 'assumption' && n.status === 'unverified'
  );

  // Compute risk score and downstream effort for each unverified assumption
  const ranked = assumptions.map((a) => {
    const score = riskScore(a, nodeMap, edges);
    const { nodes: downIds } = downstream(a.id, edges);
    const effort = effortAtRisk(downIds, nodeMap);
    return {
      assumption: a,
      riskScore: score,
      downstreamEffortWeeks: effort
    };
  });

  // Sort descending by risk score, tie-breaker: effort at risk
  ranked.sort((a, b) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return b.downstreamEffortWeeks - a.downstreamEffortWeeks;
  });

  const selected = ranked.slice(0, topN);

  return selected.map(({ assumption, riskScore: score, downstreamEffortWeeks: effort }) => {
    const priority: TaskPriority = score >= 3.0 ? 'high' : score >= 1.5 ? 'medium' : 'low';

    // Due date: from assumption.verifyBy or baseDate + 14 days
    const dueDate = assumption.verifyBy
      ? assumption.verifyBy
      : formatDateISO(addDays(baseDate, 14));

    const assignee = assumption.owner || 'Product / Tech Lead';

    const description =
      assumption.howToVerify ||
      'Thu thập số liệu đo lường thực tế hoặc phỏng vấn 5-10 người dùng mục tiêu để kiểm chứng giả định này.';

    const steps = [
      `Thu thập dữ liệu hoặc phỏng vấn đại diện người dùng cho "${assumption.text.slice(0, 60)}..."`,
      'Đối chiếu kết quả thu được với ngưỡng kỳ vọng chấp nhận',
      `Cập nhật trạng thái Xác thực hoặc Bác bỏ trên đồ thị Assumption Debt`
    ];

    return {
      id: `task-verify-${assumption.id}`,
      type: 'verification',
      title: `Kiểm chứng giả định ${assumption.id}: ${assumption.text}`,
      description,
      targetNodeId: assumption.id,
      targetNodeType: 'assumption',
      status: 'proposed',
      priority,
      dueDate,
      suggestedAssignee: assignee,
      riskScore: score,
      effortWeeksAtRisk: effort,
      actionableSteps: steps,
      createdAt: formatDateISO(baseDate)
    };
  });
}

/**
 * Generates re-examination (review) tasks for all downstream nodes when an assumption is refuted.
 * When A is refuted, every decision and task that depends on A must be evaluated.
 */
export function generateReviewTasks(
  refutedId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  baseDate: Date = new Date()
): GeneratedTask[] {
  const nodeMap = getNodeMap(nodes);
  const { nodes: affectedIds } = downstream(refutedId, edges);

  // We only generate review tasks for downstream dependents, not the refuted node itself
  const downstreamIds = affectedIds.filter((id) => id !== refutedId);
  const tasks: GeneratedTask[] = [];

  for (const id of downstreamIds) {
    const node = nodeMap[id];
    if (!node) continue;

    const isDecision = node.type === 'decision';
    const priority: TaskPriority = isDecision ? 'high' : 'medium';
    const typeLabel = isDecision ? 'Quyết định' : 'Hạng mục Công việc';

    const dueDate = formatDateISO(addDays(baseDate, isDecision ? 3 : 7));
    const assignee = node.owner || (isDecision ? 'Tech Lead / PM' : 'Engineering Team');

    const steps = [
      `Đánh giá mức độ ảnh hưởng khi giả định ${refutedId} không còn đúng`,
      `Quyết định: Huỷ bỏ, tinh chỉnh phạm vi, hay áp dụng giải pháp thay thế`,
      `Cập nhật lại kế hoạch và thông báo cho các bên liên quan`
    ];

    tasks.push({
      id: `task-review-${refutedId}-${node.id}`,
      type: 'review',
      title: `Xem lại ${typeLabel} ${node.id}: ${node.text}`,
      description: `Giả định nền tảng ${refutedId} đã bị bác bỏ. Cần đánh giá lại ${typeLabel.toLowerCase()} này để tránh lãng phí ${node.effortWeeks || 1} tuần công việc.`,
      targetNodeId: node.id,
      targetNodeType: node.type,
      status: 'proposed',
      priority,
      dueDate,
      suggestedAssignee: assignee,
      effortWeeksAtRisk: node.effortWeeks || 1,
      actionableSteps: steps,
      createdAt: formatDateISO(baseDate)
    });
  }

  return tasks;
}

/**
 * Exports tasks to a Markdown Checklist suitable for GitHub Issues, Notion, or Slack.
 */
export function exportTasksToMarkdown(
  tasks: GeneratedTask[],
  projectName: string = 'Dự án'
): string {
  const lines: string[] = [];
  lines.push(`# Kế Hoạch Task Kiểm Chứng & Xử Lý Rủi Ro`);
  lines.push(`**Dự án:** ${projectName}`);
  lines.push(`**Ngày tạo:** ${formatDateISO(new Date())}`);
  lines.push(`**Tổng số task:** ${tasks.length} (Đã duyệt: ${tasks.filter((t) => t.status === 'approved').length})\n`);

  const verificationTasks = tasks.filter((t) => t.type === 'verification');
  const reviewTasks = tasks.filter((t) => t.type === 'review');

  if (verificationTasks.length > 0) {
    lines.push(`## 1. Task Kiểm Chứng Giả Định (Verification Tasks)`);
    lines.push(`*Ưu tiên kiểm chứng các giả định có điểm rủi ro cao nhất trước khi triển khai.*`);
    lines.push('');
    for (const t of verificationTasks) {
      const checkbox = t.status === 'approved' ? '[x]' : '[ ]';
      const prioBadge = `[${t.priority.toUpperCase()}]`;
      lines.push(
        `- ${checkbox} **${prioBadge}** ${t.title}`
      );
      lines.push(`  - **Hạn chót:** ${t.dueDate} | **Phụ trách:** ${t.suggestedAssignee} | **Rủi ro:** ${t.riskScore?.toFixed(1) || 0} điểm (${t.effortWeeksAtRisk?.toFixed(1) || 0} tuần gặp nguy)`);
      lines.push(`  - **Mô tả / Cách kiểm chứng:** ${t.description}`);
      if (t.actionableSteps && t.actionableSteps.length > 0) {
        lines.push(`  - **Các bước thực hiện:**`);
        for (const step of t.actionableSteps) {
          lines.push(`    - ${step}`);
        }
      }
      lines.push(`  - **Liên kết nguồn:** Nút đồ thị [${t.targetNodeId}]`);
      lines.push('');
    }
  }

  if (reviewTasks.length > 0) {
    lines.push(`## 2. Task Xem Lại Sau Khi Bác Bỏ (Review / Pivot Tasks)`);
    lines.push(`*Các quyết định và công việc cần rà soát lại do giả định phụ thuộc đã bị bác bỏ.*`);
    lines.push('');
    for (const t of reviewTasks) {
      const checkbox = t.status === 'approved' ? '[x]' : '[ ]';
      const prioBadge = `[${t.priority.toUpperCase()}]`;
      lines.push(
        `- ${checkbox} **${prioBadge}** ${t.title}`
      );
      lines.push(`  - **Hạn chót:** ${t.dueDate} | **Phụ trách:** ${t.suggestedAssignee} | **Công việc bị đe dọa:** ${t.effortWeeksAtRisk?.toFixed(1) || 1} tuần`);
      lines.push(`  - **Lý do rà soát:** ${t.description}`);
      lines.push(`  - **Liên kết nguồn:** Nút đồ thị [${t.targetNodeId}]`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Exports tasks to CSV format (RFC-4180 compliant).
 */
export function exportTasksToCSV(tasks: GeneratedTask[]): string {
  const headers = [
    'Mã Task',
    'Loại',
    'Tiêu Đề',
    'Nút Nguồn',
    'Trạng Thái',
    'Mức Ưu Tiên',
    'Hạn Chót',
    'Người Phụ Trách',
    'Điểm Rủi Ro',
    'Số Tuần Rủi Ro',
    'Mô Tả'
  ];

  const escapeCSV = (str: string | number | undefined): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = tasks.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.type === 'verification' ? 'Kiểm chứng' : 'Xem lại'),
    escapeCSV(t.title),
    escapeCSV(t.targetNodeId),
    escapeCSV(t.status === 'approved' ? 'Đã duyệt' : t.status === 'rejected' ? 'Bị loại' : 'Đề xuất'),
    escapeCSV(t.priority.toUpperCase()),
    escapeCSV(t.dueDate),
    escapeCSV(t.suggestedAssignee),
    escapeCSV(t.riskScore ?? ''),
    escapeCSV(t.effortWeeksAtRisk ?? ''),
    escapeCSV(t.description)
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
