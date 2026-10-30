import {
  GraphNode,
  GraphEdge,
  AssumptionNode,
  DecisionNode,
  TaskNode,
  GraphMetrics
} from './types';
import { GeneratedTask } from './tasks';
import { downstream, effortAtRisk } from './graph';
import { isNodeOverdue } from './history';

export interface ReportOptions {
  generatedAt?: Date;
  includeTasks?: boolean;
}

/**
 * Generates an executive Markdown report for Assumption Debt, highlighting top risks,
 * overdue assumptions, refuted cascades, and recommended actions.
 */
export function generateAssumptionDebtReport(
  project: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  metrics: GraphMetrics,
  tasks: GeneratedTask[] = [],
  options?: ReportOptions
): string {
  const now = options?.generatedAt || new Date();
  const dateFormatted = now.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const assumptions = nodes.filter((n): n is AssumptionNode => n.type === 'assumption');
  const decisions = nodes.filter((n): n is DecisionNode => n.type === 'decision');
  const taskNodes = nodes.filter((n): n is TaskNode => n.type === 'task');

  const refutedAssumptions = assumptions.filter((a) => a.status === 'refuted');
  const overdueAssumptions = assumptions.filter((a) => isNodeOverdue(a, now));

  const lines: string[] = [];

  // Header
  lines.push(`# Báo Cáo Nợ Giả Định (Assumption Debt Report)`);
  lines.push(`**Dự án:** ${project}`);
  lines.push(`**Thời điểm xuất:** ${dateFormatted}`);
  lines.push('');

  // 1. Executive Summary
  lines.push(`## 1. Tóm Tắt Tổng Quan`);
  lines.push(`| Chỉ số | Giá trị | Ghi chú |`);
  lines.push(`|---|---|---|`);
  lines.push(
    `| **Tổng điểm nợ rủi ro (ước tính)** | **${metrics.totalDebt.toFixed(1)} điểm** | Điểm ước tính dùng để sắp xếp thứ tự ưu tiên |`
  );
  lines.push(
    `| **Công việc gặp rủi ro** | **${metrics.totalEffortAtRisk.toFixed(1)} tuần** | Công sức có nguy cơ lãng phí nếu giả định sai |`
  );
  lines.push(
    `| **Tổng số giả định nền tảng** | ${metrics.totalAssumptions} | Chưa kiểm chứng: ${metrics.unverifiedCount}, Đã xác thực: ${metrics.validatedCount}, Bị bác bỏ: ${metrics.refutedCount} |`
  );
  lines.push(
    `| **Giả định quá hạn kiểm chứng** | ${overdueAssumptions.length} | Cần ưu tiên bố trí nguồn lực xác minh ngay |`
  );
  lines.push(
    `| **Quyết định & Công việc liên đới** | ${decisions.length + taskNodes.length} | ${decisions.length} quyết định kiến trúc, ${taskNodes.length} hạng mục công việc |`
  );
  lines.push('');

  // 2. Ranked Assumptions (Top Priority to Verify)
  lines.push(`## 2. Thứ Tự Ưu Tiên Kiểm Chứng (Xếp theo Điểm Nợ Ước Tính)`);
  if (metrics.rankedAssumptions.length === 0) {
    lines.push(`*Không có giả định nào cần kiểm chứng hoặc tất cả đã được xác thực.*`);
  } else {
    lines.push(
      `| Thứ hạng | Mã | Giả định | Điểm rủi ro (ước tính) | Ảnh hưởng dây chuyền | Hạn kiểm chứng | Phụ trách | Trạng thái |`
    );
    lines.push(`|---|---|---|---|---|---|---|---|`);

    metrics.rankedAssumptions.forEach((item, idx) => {
      const a = assumptions.find((n) => n.id === item.assumptionId);
      if (!a) return;
      const statusText =
        a.status === 'unverified'
          ? (isNodeOverdue(a, now) ? '⚠️ Quá hạn' : 'Chưa kiểm chứng')
          : a.status === 'validated'
          ? '✅ Đã xác thực'
          : '❌ Bị bác bỏ';
      const cleanText = a.text.replace(/\|/g, '\\|');
      lines.push(
        `| #${idx + 1} | \`${a.id}\` | ${cleanText} | **${item.riskScore.toFixed(1)}** | ${item.downstreamEffortWeeks.toFixed(1)} tuần (${item.downstreamCount} mục) | ${a.verifyBy || 'Chưa đặt'} | ${a.owner || 'Chưa gán'} | ${statusText} |`
      );
    });
  }
  lines.push('');

  // 3. Overdue Assumptions Alert
  if (overdueAssumptions.length > 0) {
    lines.push(`## 3. Cảnh Báo Giả Định Đã Quá Hạn Kiểm Chứng`);
    lines.push(`Các giả định sau đã vượt quá thời hạn kiểm chứng cam kết (\`verifyBy\`) nhưng vẫn chưa có bằng chứng thực tế:`);
    lines.push('');
    overdueAssumptions.forEach((a) => {
      lines.push(
        `- **[${a.id}]** ${a.text} *(Hạn: ${a.verifyBy}, Phụ trách: ${a.owner || 'Chưa gán'})*`
      );
      if (a.howToVerify) {
        lines.push(`  - *Phương án kiểm chứng:* ${a.howToVerify}`);
      }
    });
    lines.push('');
  }

  // 4. Refuted Assumptions & Cascading Downstream Impact
  lines.push(`## 4. Giả Định Bị Bác Bỏ & Tác Động Dây Chuyền (Cascade)`);
  if (refutedAssumptions.length === 0) {
    lines.push(`*Chưa có giả định nào bị bác bỏ.*`);
  } else {
    refutedAssumptions.forEach((a) => {
      const down = downstream(a.id, edges);
      const weeks = effortAtRisk(down.nodes, nodes);
      lines.push(`### ❌ Giả định \`${a.id}\`: ${a.text}`);
      if (a.refuteReason) {
        lines.push(`> **Lý do bác bỏ:** ${a.refuteReason}`);
      }
      lines.push(`- **Công sức bị ảnh hưởng:** ${weeks.toFixed(1)} tuần`);
      lines.push(`- **Các hạng mục phụ thuộc cần xem xét lại ngay:**`);
      if (down.nodes.length === 0) {
        lines.push(`  - *(Không có quyết định nào phụ thuộc trực tiếp)*`);
      } else {
        down.nodes.forEach((downId) => {
          const downNode = nodes.find((n) => n.id === downId);
          const typeName =
            downNode?.type === 'decision'
              ? 'Quyết định'
              : downNode?.type === 'task'
              ? 'Công việc'
              : 'Giả định phụ';
          lines.push(
            `  - [\`${downId}\`] **${typeName}**: ${downNode?.text || ''} (${downNode?.effortWeeks || 1} tuần)`
          );
        });
      }
      lines.push('');
    });
  }

  // 5. Actionable Tasks (Verification & Review)
  if (tasks.length > 0) {
    lines.push(`## 5. Danh Sách Công Việc Đề Xuất (Action Tasks)`);
    lines.push(`| Ưu tiên | Loại task | Mục tiêu | Hạn chót | Phụ trách | Trạng thái |`);
    lines.push(`|---|---|---|---|---|---|`);

    tasks.forEach((t) => {
      const prio = t.priority === 'high' ? 'Cao' : t.priority === 'medium' ? 'Vừa' : 'Thấp';
      const type = t.type === 'verification' ? 'Kiểm chứng giả định' : 'Xem lại sau Bác bỏ';
      const status = t.status === 'approved' ? 'Đã duyệt' : t.status === 'rejected' ? 'Bỏ qua' : 'Cần duyệt';
      lines.push(
        `| ${prio} | ${type} | [\`${t.targetNodeId}\`] ${t.title.replace(/\|/g, '\\|')} | ${t.dueDate} | ${t.suggestedAssignee} | ${status} |`
      );
    });
    lines.push('');
  }

  // Footer Note
  lines.push(`---`);
  lines.push(`*Báo cáo được sinh tự động bởi hệ thống Assumption Debt. Điểm số mang tính chất ước tính tương đối nhằm phục vụ việc xếp hạng rủi ro và ra quyết định.*`);

  return lines.join('\n');
}
