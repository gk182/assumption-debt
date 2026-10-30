import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GraphNode,
  GraphEdge,
  ProjectGraph,
  AssumptionNode,
  DownstreamResult
} from './types';
import {
  computeGraphMetrics,
  getNeedsReviewNodes,
  downstream,
  effortAtRisk,
  addEdgeSafe,
  removeEdgeSafe,
  removeNodeSafe
} from './graph';
import seedData from '../../data/demo/seed.json';
import { ExtractedAssumption, ExtractedDecision, ExtractedLink } from './schema';
import {
  GeneratedTask,
  generateVerificationTasks,
  generateReviewTasks
} from './tasks';
import {
  recordStatusChange,
  recordEvidence,
  appendNodeHistory,
  createHistoryEvent
} from './history';

export interface CascadeState {
  isActive: boolean;
  refutedId: string | null;
  affectedNodeIds: string[];
  depthById: Record<string, number>;
  totalWeeksAtRisk: number;
  reason?: string;
}

interface GraphStore {
  // Graph Data
  project: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;

  // Active Cascade Alert / Animation
  cascade: CascadeState | null;

  // Review Inbox (Temporary proposed items before confirmation)
  proposedProjectName: string | null;
  proposedAssumptions: ExtractedAssumption[];
  proposedDecisions: ExtractedDecision[];
  proposedLinks: ExtractedLink[];
  reviewDecisions: Record<string, { action: 'confirm' | 'reject'; text?: string; importance?: number }>;

  // Phase 7: History for Undo / Redo
  past: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  future: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;

  // Phase 7: Manual Node & Edge Editing
  addManualNode: (data: {
    type: 'assumption' | 'decision' | 'task';
    text: string;
    importance?: number;
    effortWeeks?: number;
    owner?: string;
    category?: string;
  }) => string;
  deleteNode: (nodeId: string) => void;
  connectNodes: (from: string, to: string, reason?: string) => { success: boolean; error?: string };
  disconnectNodes: (from: string, to: string) => void;

  // Derived getters
  getMetrics: (now?: Date) => ReturnType<typeof computeGraphMetrics>;
  getNeedsReviewIds: () => Set<string>;
  getDownstreamOfSelected: () => DownstreamResult | null;

  // Actions
  selectNode: (id: string | null) => void;
  loadSeedData: () => void;
  resetToInitial: () => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  refuteAssumption: (id: string, reason?: string) => void;
  validateAssumption: (id: string) => void;
  resetAssumptionStatus: (id: string) => void;
  dismissCascade: () => void;

  // Review Inbox actions
  setProposedData: (
    assumptions: ExtractedAssumption[],
    decisions: ExtractedDecision[],
    links: ExtractedLink[],
    projectName?: string
  ) => void;
  setReviewDecision: (tempId: string, action: 'confirm' | 'reject', text?: string, importance?: number) => void;
  commitReviewToGraph: (replace?: boolean) => void;

  // Phase 9: History & Evidence
  addEvidenceToNode: (id: string, evidence: string, note?: string) => void;

  // Phase 8: Task Generator
  tasks: GeneratedTask[];
  generateTasks: (topN?: number) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;
  updateTask: (taskId: string, patch: Partial<GeneratedTask>) => void;
  approveAllTasks: () => void;
  clearTasks: () => void;
}

const initialSeedGraph: ProjectGraph = {
  project: seedData.project,
  nodes: seedData.nodes as GraphNode[],
  edges: seedData.edges as GraphEdge[]
};

export const useGraphStore = create<GraphStore>()(
  persist(
    (set, get) => ({
      project: initialSeedGraph.project,
      nodes: initialSeedGraph.nodes,
      edges: initialSeedGraph.edges,
      selectedNodeId: null,
      cascade: null,
      tasks: generateVerificationTasks(initialSeedGraph.nodes, initialSeedGraph.edges, 3),

      // Phase 7: Undo / Redo
      past: [],
      future: [],
      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,
      undo: () => {
        const { past, future, nodes, edges } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        set({
          past: newPast,
          future: [{ nodes, edges }, ...future.slice(0, 24)],
          nodes: previous.nodes,
          edges: previous.edges,
          cascade: null
        });
      },
      redo: () => {
        const { past, future, nodes, edges } = get();
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: newFuture,
          nodes: next.nodes,
          edges: next.edges,
          cascade: null
        });
      },

      // Phase 7: Manual Node & Edge Editing
      addManualNode: (data) => {
        const { nodes, edges, past } = get();
        const existingTyped = nodes.filter((n) => n.type === data.type);
        const prefix = data.type === 'assumption' ? 'A' : data.type === 'decision' ? 'D' : 'T';

        let maxIndex = 0;
        for (const n of existingTyped) {
          const match = n.id.match(/^([A-Z]+)(\d+)$/);
          if (match && match[1] === prefix) {
            const num = parseInt(match[2], 10);
            if (num > maxIndex) maxIndex = num;
          }
        }
        const newId = `${prefix}${maxIndex + 1}`;

        const createdEvent = createHistoryEvent('created', {
          note: 'Nút được tạo thủ công',
          author: 'Người dùng'
        });

        let newNode: GraphNode;
        if (data.type === 'assumption') {
          newNode = {
            id: newId,
            type: 'assumption',
            text: data.text,
            status: 'unverified',
            importance: data.importance || 3,
            confidence: 0.5,
            owner: data.owner || 'Chưa gán',
            category: (data.category as any) || 'other',
            whyItMatters: 'Giả định được thêm thủ công',
            howToVerify: 'Xác thực qua khảo sát hoặc thử nghiệm thực tế',
            history: [createdEvent]
          };
        } else if (data.type === 'decision') {
          newNode = {
            id: newId,
            type: 'decision',
            text: data.text,
            status: 'active',
            effortWeeks: data.effortWeeks || 1,
            owner: data.owner,
            history: [createdEvent]
          };
        } else {
          newNode = {
            id: newId,
            type: 'task',
            text: data.text,
            status: 'active',
            effortWeeks: data.effortWeeks || 1,
            owner: data.owner,
            history: [createdEvent]
          };
        }

        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: [],
          nodes: [...nodes, newNode],
          selectedNodeId: newId
        });
        return newId;
      },

      deleteNode: (nodeId: string) => {
        const { nodes, edges, past, selectedNodeId } = get();
        const res = removeNodeSafe(nodes, edges, nodeId);
        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: [],
          nodes: res.nodes,
          edges: res.edges,
          selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId
        });
      },

      connectNodes: (from: string, to: string, reason?: string) => {
        const { nodes, edges, past } = get();
        const nodeIds = new Set(nodes.map((n) => n.id));
        const res = addEdgeSafe(edges, { from, to, relation: 'depends_on', reason }, nodeIds);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: [],
          edges: res.edges
        });
        return { success: true };
      },

      disconnectNodes: (from: string, to: string) => {
        const { nodes, edges, past } = get();
        const nextEdges = removeEdgeSafe(edges, from, to);
        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: [],
          edges: nextEdges
        });
      },

      proposedProjectName: null,
      proposedAssumptions: [],
      proposedDecisions: [],
      proposedLinks: [],
      reviewDecisions: {},

      getMetrics: (now?: Date) => {
        const { project, nodes, edges } = get();
        return computeGraphMetrics({ project, nodes, edges }, now);
      },

      getNeedsReviewIds: () => {
        const { nodes, edges } = get();
        return getNeedsReviewNodes(nodes, edges);
      },

      getDownstreamOfSelected: () => {
        const { selectedNodeId, edges } = get();
        if (!selectedNodeId) return null;
        return downstream(selectedNodeId, edges);
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      loadSeedData: () => {
        set({
          project: initialSeedGraph.project,
          nodes: [...initialSeedGraph.nodes],
          edges: [...initialSeedGraph.edges],
          selectedNodeId: null,
          cascade: null,
          tasks: generateVerificationTasks(initialSeedGraph.nodes, initialSeedGraph.edges, 3)
        });
      },

      resetToInitial: () => {
        set({
          project: initialSeedGraph.project,
          nodes: JSON.parse(JSON.stringify(initialSeedGraph.nodes)),
          edges: JSON.parse(JSON.stringify(initialSeedGraph.edges)),
          selectedNodeId: null,
          cascade: null,
          tasks: generateVerificationTasks(initialSeedGraph.nodes, initialSeedGraph.edges, 3),
          proposedProjectName: null,
          proposedAssumptions: [],
          proposedDecisions: [],
          proposedLinks: [],
          reviewDecisions: {}
        });
      },

      updateNode: (id, updates) => {
        const { nodes, edges, past } = get();
        const targetNode = nodes.find((n) => n.id === id);
        let finalUpdates: Partial<GraphNode> = updates;

        if (targetNode) {
          const hasContentChange =
            (updates.text !== undefined && updates.text !== targetNode.text) ||
            (updates.owner !== undefined && updates.owner !== targetNode.owner) ||
            ('importance' in updates && (updates as any).importance !== (targetNode as any).importance) ||
            ('verifyBy' in updates && (updates as any).verifyBy !== (targetNode as any).verifyBy);

          if (hasContentChange) {
            const editEvent = createHistoryEvent('edited', {
              note: 'Cập nhật thông tin node',
              author: 'Người dùng'
            });
            const existingHistory = targetNode.history ? [...targetNode.history] : [];
            finalUpdates = {
              ...updates,
              history: [...existingHistory, editEvent]
            };
          }
        }

        set({
          past: [...past.slice(-24), { nodes, edges }],
          future: [],
          nodes: nodes.map((n) => (n.id === id ? ({ ...n, ...finalUpdates } as GraphNode) : n))
        });
      },

      refuteAssumption: (id, reason) => {
        const { nodes, edges } = get();
        const targetNode = nodes.find((n) => n.id === id);
        if (!targetNode || targetNode.type !== 'assumption') return;

        // Compute downstream impact
        const down = downstream(id, edges);
        const weeksAtRisk = effortAtRisk(down.nodes, nodes);

        const updatedNodes = nodes.map((n) =>
          n.id === id
            ? recordStatusChange(n, 'refuted', {
                note: reason || 'Bác bỏ bởi kiểm chứng thực tế',
                author: 'Người dùng'
              })
            : n
        );

        // Phase 8: Automatically generate review tasks for affected downstream nodes
        const reviewTasks = generateReviewTasks(id, nodes, edges);
        const currentTasks = get().tasks || [];
        const existingTaskIds = new Set(currentTasks.map((t) => t.id));
        const mergedTasks = [
          ...reviewTasks.filter((t) => !existingTaskIds.has(t.id)),
          ...currentTasks
        ];

        set({
          nodes: updatedNodes,
          selectedNodeId: id,
          tasks: mergedTasks,
          cascade: {
            isActive: true,
            refutedId: id,
            affectedNodeIds: down.nodes,
            depthById: down.depthById,
            totalWeeksAtRisk: weeksAtRisk,
            reason: reason || 'Bác bỏ bởi kiểm chứng thực tế'
          }
        });
      },

      validateAssumption: (id) => {
        const { nodes, tasks } = get();
        const updatedNodes = nodes.map((n) =>
          n.id === id
            ? recordStatusChange(n, 'validated', {
                note: 'Đã xác thực thành công qua bằng chứng thực tế',
                author: 'Người dùng'
              })
            : n
        );
        const updatedTasks = (tasks || []).map((t) =>
          t.targetNodeId === id && t.type === 'verification'
            ? { ...t, status: 'approved' as const }
            : t
        );
        set((state) => ({
          nodes: updatedNodes,
          tasks: updatedTasks,
          cascade: state.cascade?.refutedId === id ? null : state.cascade
        }));
      },

      resetAssumptionStatus: (id) => {
        const { nodes } = get();
        const updatedNodes = nodes.map((n) =>
          n.id === id
            ? recordStatusChange(n, 'unverified', {
                note: 'Đặt lại trạng thái thành Chưa kiểm chứng',
                author: 'Người dùng'
              })
            : n
        );
        set((state) => ({
          nodes: updatedNodes,
          cascade: state.cascade?.refutedId === id ? null : state.cascade
        }));
      },

      addEvidenceToNode: (id, evidence, note) => {
        const { nodes } = get();
        const updatedNodes = nodes.map((n) =>
          n.id === id ? recordEvidence(n, evidence, note, 'Người dùng') : n
        );
        set({ nodes: updatedNodes });
      },

      dismissCascade: () => {
        set((state) => ({
          cascade: state.cascade ? { ...state.cascade, isActive: false } : null
        }));
      },

  // Phase 8: Task Generator Actions
      generateTasks: (topN = 3) => {
        const { nodes, edges, tasks } = get();
        const newVerifications = generateVerificationTasks(nodes, edges, topN);
        const existingIds = new Set((tasks || []).map((t) => t.id));
        set({
          tasks: [
            ...newVerifications.filter((t) => !existingIds.has(t.id)),
            ...(tasks || [])
          ]
        });
      },

      approveTask: (taskId) => {
        const { tasks } = get();
        set({
          tasks: (tasks || []).map((t) => (t.id === taskId ? { ...t, status: 'approved' } : t))
        });
      },

      rejectTask: (taskId) => {
        const { tasks } = get();
        set({
          tasks: (tasks || []).map((t) => (t.id === taskId ? { ...t, status: 'rejected' } : t))
        });
      },

      updateTask: (taskId, patch) => {
        const { tasks } = get();
        set({
          tasks: (tasks || []).map((t) => (t.id === taskId ? { ...t, ...patch } : t))
        });
      },

      approveAllTasks: () => {
        const { tasks } = get();
        set({
          tasks: (tasks || []).map((t) => ({ ...t, status: 'approved' }))
        });
      },

      clearTasks: () => {
        set({ tasks: [] });
      },

      setProposedData: (assumptions, decisions, links, projectName) => {
        const initialReviews: Record<string, { action: 'confirm' | 'reject' }> = {};
        for (const a of assumptions) {
          initialReviews[a.tempId] = { action: 'confirm' };
        }
        set({
          proposedProjectName: projectName || null,
          proposedAssumptions: assumptions,
          proposedDecisions: decisions,
          proposedLinks: links,
          reviewDecisions: initialReviews
        });
      },

      setReviewDecision: (tempId, action, text, importance) => {
        set((state) => ({
          reviewDecisions: {
            ...state.reviewDecisions,
            [tempId]: { action, text, importance }
          }
        }));
      },

      commitReviewToGraph: (replace = true) => {
        const {
          proposedAssumptions,
          proposedDecisions,
          proposedLinks,
          proposedProjectName,
          reviewDecisions,
          nodes: existingNodes,
          edges: existingEdges,
          project: existingProject
        } = get();

        const idMap: Record<string, string> = {};
        const newNodes: GraphNode[] = [];

        // Determine starting indices
        let assumptionIndex = replace ? 1 : existingNodes.filter((n) => n.type === 'assumption').length + 1;
        let decisionIndex = replace ? 1 : existingNodes.filter((n) => n.type === 'decision').length + 1;
        let taskIndex = replace ? 1 : existingNodes.filter((n) => n.type === 'task').length + 1;

        // 1. Convert confirmed assumptions
        for (const pa of proposedAssumptions) {
          const decision = reviewDecisions[pa.tempId];
          if (decision?.action === 'reject') continue; // Dropped by human reviewer

          const realId = `A${assumptionIndex++}`;
          idMap[pa.tempId] = realId;
          idMap[pa.tempId.toLowerCase()] = realId;
          idMap[pa.tempId.toUpperCase()] = realId;

          newNodes.push({
            id: realId,
            type: 'assumption',
            text: decision?.text || pa.text,
            status: 'unverified',
            importance: decision?.importance || pa.suggestedImportance || 3,
            confidence: 0.5,
            owner: 'Team',
            category: pa.category,
            whyItMatters: pa.whyItMatters,
            howToVerify: pa.howToVerify,
            source: {
              quote: pa.source.quote,
              location: pa.source.location
            }
          });
        }

        // 2. Convert decisions and tasks
        for (const pd of proposedDecisions) {
          const isTask = pd.kind === 'task';
          const realId = isTask ? `T${taskIndex++}` : `D${decisionIndex++}`;
          idMap[pd.tempId] = realId;
          idMap[pd.tempId.toLowerCase()] = realId;
          idMap[pd.tempId.toUpperCase()] = realId;

          if (isTask) {
            newNodes.push({
              id: realId,
              type: 'task',
              text: pd.text,
              status: 'active',
              effortWeeks: pd.estimatedEffortWeeks || 1,
              source: pd.source ? { quote: pd.source.quote, location: pd.source.location } : undefined
            });
          } else {
            newNodes.push({
              id: realId,
              type: 'decision',
              text: pd.text,
              status: 'active',
              effortWeeks: pd.estimatedEffortWeeks || 1,
              source: pd.source ? { quote: pd.source.quote, location: pd.source.location } : undefined
            });
          }
        }

        // 3. Convert links
        const newEdges: GraphEdge[] = [];
        const seenEdges = new Set<string>();

        for (const pl of proposedLinks) {
          const fromReal = idMap[pl.from] || (pl.from ? idMap[pl.from.toLowerCase()] : undefined);
          const toReal = idMap[pl.to] || (pl.to ? idMap[pl.to.toLowerCase()] : undefined);
          if (fromReal && toReal && fromReal !== toReal) {
            const edgeKey = `${fromReal}->${toReal}`;
            if (!seenEdges.has(edgeKey)) {
              seenEdges.add(edgeKey);
              newEdges.push({
                from: fromReal,
                to: toReal,
                relation: 'depends_on',
                reason: pl.reason
              });
            }
          }
        }

        // 4. Guarantee graph connectivity:
        // Ensure every Decision is linked to at least one Assumption,
        // and every Task is linked to at least one Decision.
        const assumptionsList = newNodes.filter((n) => n.type === 'assumption');
        const decisionsList = newNodes.filter((n) => n.type === 'decision');
        const tasksList = newNodes.filter((n) => n.type === 'task');

        if (assumptionsList.length > 0) {
          decisionsList.forEach((d, idx) => {
            const hasAssumptionLink = newEdges.some((e) => e.from === d.id);
            if (!hasAssumptionLink) {
              // Connect to corresponding or round-robin assumption
              const targetAssumption = assumptionsList[idx % assumptionsList.length];
              newEdges.push({
                from: d.id,
                to: targetAssumption.id,
                relation: 'depends_on',
                reason: 'Quyết định phụ thuộc vào giả định nền tảng'
              });
            }
          });
        }

        if (decisionsList.length > 0) {
          tasksList.forEach((t, idx) => {
            const hasDecisionLink = newEdges.some((e) => e.from === t.id);
            if (!hasDecisionLink) {
              // Connect to corresponding or round-robin decision
              const targetDecision = decisionsList[idx % decisionsList.length];
              newEdges.push({
                from: t.id,
                to: targetDecision.id,
                relation: 'depends_on',
                reason: 'Hạng mục triển khai quyết định này'
              });
            }
          });
        }

        const finalProject = replace && proposedProjectName ? proposedProjectName : existingProject;
        const finalNodes = replace ? newNodes : [...existingNodes, ...newNodes];
        const finalEdges = replace ? newEdges : [...existingEdges, ...newEdges];
        const generatedTasks = generateVerificationTasks(finalNodes, finalEdges, 4);

        // Merge or replace
        set({
          project: finalProject,
          nodes: finalNodes,
          edges: finalEdges,
          tasks: generatedTasks,
          cascade: null,
          proposedAssumptions: [],
          proposedDecisions: [],
          proposedLinks: [],
          proposedProjectName: null,
          reviewDecisions: {},
          selectedNodeId: newNodes[0]?.id || null
        });
      }
    }),
    {
      name: 'assumption-debt-store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // If older version or old Checkout project was cached, reset to fresh initial seed
        if (
          version < 2 ||
          !persistedState ||
          persistedState.project?.includes('Checkout') ||
          persistedState.project?.includes('Rút gọn quy trình')
        ) {
          return {
            ...persistedState,
            project: initialSeedGraph.project,
            nodes: initialSeedGraph.nodes,
            edges: initialSeedGraph.edges,
            cascade: null,
            proposedProjectName: null
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        project: state.project,
        nodes: state.nodes,
        edges: state.edges,
        tasks: state.tasks,
        cascade: state.cascade,
        proposedProjectName: state.proposedProjectName,
        proposedAssumptions: state.proposedAssumptions,
        proposedDecisions: state.proposedDecisions,
        proposedLinks: state.proposedLinks,
        reviewDecisions: state.reviewDecisions
      })
    }
  )
);
