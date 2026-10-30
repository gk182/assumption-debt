export type NodeType = 'assumption' | 'decision' | 'task';

export type AssumptionStatus = 'proposed' | 'unverified' | 'validated' | 'refuted';
export type DecisionStatus = 'active' | 'deprecated' | 'superseded';
export type TaskStatus = 'active' | 'in_progress' | 'completed' | 'abandoned';

export type NodeStatus = AssumptionStatus | DecisionStatus | TaskStatus;

export type HistoryAction =
  | 'created'
  | 'status_change'
  | 'refuted'
  | 'validated'
  | 'edited'
  | 'evidence_added';

export interface NodeHistoryEvent {
  at: string; // ISO 8601 string, e.g. "2026-10-30T09:00:00.000Z"
  action: HistoryAction;
  from?: string;
  to?: string;
  note?: string;
  evidence?: string;
  author?: string;
}

export interface SourceReference {
  doc?: string;
  quote: string;
  location?: string;
}

export interface BaseNode {
  id: string;
  type: NodeType;
  text: string;
  effortWeeks?: number;
  owner?: string;
  source?: SourceReference;
  history?: NodeHistoryEvent[];
  evidenceUrl?: string;
  evidenceNotes?: string;
}

export interface AssumptionNode extends BaseNode {
  type: 'assumption';
  status: AssumptionStatus;
  importance: number; // 1 to 5
  confidence: number; // 0.0 to 1.0
  owner?: string;
  verifyBy?: string; // YYYY-MM-DD
  category?: 'user_behavior' | 'technical_dependency' | 'data' | 'market' | 'resource_timeline' | 'legal';
  whyItMatters?: string;
  howToVerify?: string;
  refuteReason?: string;
}

export interface DecisionNode extends BaseNode {
  type: 'decision';
  status: DecisionStatus;
  effortWeeks: number;
}

export interface TaskNode extends BaseNode {
  type: 'task';
  status: TaskStatus;
  effortWeeks: number;
}

export type GraphNode = AssumptionNode | DecisionNode | TaskNode;

export type EdgeRelation = 'depends_on';

export interface GraphEdge {
  from: string; // The dependent node (e.g. D1)
  to: string;   // The dependency node (e.g. A1)
  relation: EdgeRelation;
  reason?: string;
}

export interface ProjectGraph {
  project: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DownstreamResult {
  nodes: string[];
  depthById: Record<string, number>;
  cycleDetected: boolean;
}

export interface RiskAnalysis {
  assumptionId: string;
  riskScore: number;
  downstreamCount: number;
  downstreamEffortWeeks: number;
  isOverdue: boolean;
}

export interface GraphMetrics {
  totalAssumptions: number;
  unverifiedCount: number;
  validatedCount: number;
  refutedCount: number;
  totalDebt: number; // Sum of risk scores
  totalEffortAtRisk: number;
  overdueCount: number;
  rankedAssumptions: RiskAnalysis[];
}

