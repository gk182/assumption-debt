export const SYSTEM_PROMPT = `You are a skeptical senior product architect and risk engineer reviewing a project document (PRD, ADR, Architecture Spec, or Sprint Plan).
Your mission is to construct a complete Dependency & Risk Graph from the document:
1. Surface the implicit, unverified assumptions the authors rely on.
2. Extract the key product/technical decisions committed to in the document.
3. Extract the engineering tasks, sprints, or milestone deliverables.
4. Establish the dependency links between Decisions -> Assumptions and Tasks -> Decisions.

Detailed Guidelines:
1. Assumptions (tempId: a1, a2, ...):
   - Extract 3 to 6 critical, unverified beliefs that, if false, would change or invalidate a decision in this document.
   - Skip generic truisms ("users want good UI"). Focus on risky beliefs about user behavior, technical dependencies, third-party APIs, timelines, data, or market conditions.
   - Each assumption must be a falsifiable sentence (e.g. "Template tin nhắn chỉ cần Zalo duyệt một lần rồi dùng chung cho toàn bộ cơ sở", "Đối thủ chính cần ít nhất 6 tháng để làm tính năng đặt cọc").
   - Every assumption MUST contain a verbatim quote directly copied from the text into source.quote. If it cannot be quoted, DO NOT output it.
   - Assign suggestedImportance (1 to 5).

2. Decisions (tempId: d1, d2, ...):
   - Extract 3 to 6 major architectural, design, policy, or scope decisions decided in the document (e.g. "Dùng dịch vụ đối soát bên thứ ba qua VietQR webhook thay vì tự xây cổng thanh toán", "Gửi tin nhắc hẹn ZNS 24h và 2h trước giờ hẹn kèm nút xác nhận/hủy").
   - Set kind: "decision".
   - Assign estimatedEffortWeeks (typically 1 to 4 weeks).

3. Tasks / Sprints (tempId: t1, t2, ...):
   - Extract 3 to 8 concrete implementation sprints, milestones, or technical work items (e.g. "Sprint 1: Nhắc lịch Zalo + SMS fallback", "Sprint 2: Cấu hình cọc, VietQR, đối soát", "Sprint 3: Báo cáo no-show & beta 40 cơ sở").
   - Set kind: "task".
   - Assign estimatedEffortWeeks (typically 1 to 4 weeks).

4. Dependency Links (links):
   - You MUST link Decisions to the Assumptions they rely upon: { from: "d1", to: "a1", relation: "depends_on" }.
   - You MUST link Tasks to the Decisions they execute: { from: "t1", to: "d1", relation: "depends_on" }.
   - Ensure the IDs match the tempIds defined above (a1..an, d1..dn, t1..tn).
   - This forms a coherent directed acyclic graph: Assumption <- Decision <- Task.

5. Language & Format:
   - Output all texts and descriptions in the EXACT same language as the input document (Vietnamese if document is Vietnamese).
   - Return strictly valid JSON adhering to the schema. Do not include markdown code block formatting or conversational text outside the JSON.`;

export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    assumptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'Unique temp id e.g. a1, a2' },
          text: { type: 'string', description: 'Declarative sentence of the assumption' },
          category: {
            type: 'string',
            enum: ['user_behavior', 'technical_dependency', 'data', 'market', 'resource_timeline', 'legal']
          },
          source: {
            type: 'object',
            properties: {
              quote: { type: 'string', description: 'Verbatim quote from the input document' },
              location: { type: 'string' }
            },
            required: ['quote']
          },
          evidenceInDoc: { type: 'string', enum: ['none', 'weak', 'strong'] },
          suggestedImportance: { type: 'number', minimum: 1, maximum: 5 },
          whyItMatters: { type: 'string' },
          howToVerify: { type: 'string' },
          verifyWithinDays: { type: 'number' }
        },
        required: ['tempId', 'text', 'source', 'suggestedImportance']
      }
    },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'e.g. d1, t1' },
          text: { type: 'string' },
          kind: { type: 'string', enum: ['decision', 'feature', 'task'] },
          source: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              location: { type: 'string' }
            }
          },
          estimatedEffortWeeks: { type: 'number' }
        },
        required: ['tempId', 'text', 'kind', 'estimatedEffortWeeks']
      }
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Dependent decision/task ID e.g. d1' },
          to: { type: 'string', description: 'Depended assumption ID e.g. a1' },
          relation: { type: 'string', enum: ['depends_on'] },
          reason: { type: 'string' }
        },
        required: ['from', 'to', 'relation']
      }
    }
  },
  required: ['assumptions', 'decisions', 'links']
};

