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
  effortAtRisk
} from './graph';
import seedData from '../../data/demo/seed.json';
import { ExtractedAssumption, ExtractedDecision, ExtractedLink } from './schema';

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
          cascade: null
        });
      },

      resetToInitial: () => {
        set({
          project: initialSeedGraph.project,
          nodes: JSON.parse(JSON.stringify(initialSeedGraph.nodes)),
          edges: JSON.parse(JSON.stringify(initialSeedGraph.edges)),
          selectedNodeId: null,
          cascade: null,
          proposedProjectName: null,
          proposedAssumptions: [],
          proposedDecisions: [],
          proposedLinks: [],
          reviewDecisions: {}
        });
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? ({ ...n, ...updates } as GraphNode) : n))
        }));
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
            ? ({
                ...n,
                status: 'refuted' as const,
                refuteReason: reason || 'Bác bỏ bởi kiểm chứng thực tế'
              } as AssumptionNode)
            : n
        );

        set({
          nodes: updatedNodes,
          selectedNodeId: id,
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
        const { nodes } = get();
        const updatedNodes = nodes.map((n) =>
          n.id === id ? ({ ...n, status: 'validated' as const, refuteReason: undefined } as AssumptionNode) : n
        );
        set((state) => ({
          nodes: updatedNodes,
          cascade: state.cascade?.refutedId === id ? null : state.cascade
        }));
      },

      resetAssumptionStatus: (id) => {
        const { nodes } = get();
        const updatedNodes = nodes.map((n) =>
          n.id === id ? ({ ...n, status: 'unverified' as const, refuteReason: undefined } as AssumptionNode) : n
        );
        set((state) => ({
          nodes: updatedNodes,
          cascade: state.cascade?.refutedId === id ? null : state.cascade
        }));
      },

      dismissCascade: () => {
        set((state) => ({
          cascade: state.cascade ? { ...state.cascade, isActive: false } : null
        }));
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
        for (const pl of proposedLinks) {
          const fromReal = idMap[pl.from];
          const toReal = idMap[pl.to];
          if (fromReal && toReal) {
            newEdges.push({
              from: fromReal,
              to: toReal,
              relation: 'depends_on',
              reason: pl.reason
            });
          }
        }

        const finalProject = replace && proposedProjectName ? proposedProjectName : existingProject;

        // Merge or replace
        set({
          project: finalProject,
          nodes: replace ? newNodes : [...existingNodes, ...newNodes],
          edges: replace ? newEdges : [...existingEdges, ...newEdges],
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
