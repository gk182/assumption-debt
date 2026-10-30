import { describe, it, expect } from 'vitest';
import {
  exportProjectToJSON,
  importProjectFromJSON,
  migrateProjectData,
  CURRENT_SCHEMA_VERSION
} from './storage';
import seedData from '../../data/demo/seed.json';
import { GraphNode, GraphEdge } from './types';
import { GeneratedTask } from './tasks';

describe('Storage & Export/Import (Phase 10)', () => {
  const sampleNodes = seedData.nodes as GraphNode[];
  const sampleEdges = seedData.edges as GraphEdge[];
  const sampleTasks: GeneratedTask[] = [
    {
      id: 'task-test-1',
      type: 'verification',
      title: 'Xác minh A1',
      description: 'Khảo sát 20 shop',
      targetNodeId: 'A1',
      targetNodeType: 'assumption',
      status: 'proposed',
      priority: 'high',
      dueDate: '2026-11-10',
      suggestedAssignee: 'PM',
      riskScore: 3.0,
      effortWeeksAtRisk: 6.0,
      actionableSteps: ['Lập form', 'Gửi shop'],
      createdAt: '2026-10-30T00:00:00.000Z'
    }
  ];

  it('exports project graph to versioned JSON string', () => {
    const json = exportProjectToJSON('Test Project', sampleNodes, sampleEdges, sampleTasks);
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.project).toBe('Test Project');
    expect(parsed.nodes).toHaveLength(sampleNodes.length);
    expect(parsed.edges).toHaveLength(sampleEdges.length);
    expect(parsed.tasks).toHaveLength(1);
    expect(new Date(parsed.exportedAt).getTime()).toBeGreaterThan(0);
  });

  it('successfully round-trips exported project through import', () => {
    const json = exportProjectToJSON(seedData.project, sampleNodes, sampleEdges, sampleTasks);
    const result = importProjectFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.project).toBe(seedData.project);
    expect(result.data?.nodes).toEqual(sampleNodes);
    expect(result.data?.edges).toEqual(sampleEdges);
    expect(result.data?.tasks).toEqual(sampleTasks);
    expect(result.migratedFromVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('migrates legacy seed.json without schemaVersion smoothly (version 0 -> 1)', () => {
    // seedData has { project, nodes, edges } but no schemaVersion or tasks
    const legacyJson = JSON.stringify(seedData);
    const result = importProjectFromJSON(legacyJson);

    expect(result.success).toBe(true);
    expect(result.data?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.data?.project).toBe(seedData.project);
    expect(result.data?.nodes).toHaveLength(seedData.nodes.length);
    expect(result.data?.tasks).toEqual([]);
    expect(result.migratedFromVersion).toBe(0);
  });

  it('handles invalid JSON string gracefully', () => {
    const result = importProjectFromJSON('{ broken json ...');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects JSON missing required nodes and edges', () => {
    const invalidObj = { message: 'hello', numbers: [1, 2, 3] };
    const result = importProjectFromJSON(JSON.stringify(invalidObj));
    expect(result.success).toBe(false);
    expect(result.error).toContain('không chứa dữ liệu đồ thị hợp lệ');
  });

  it('rejects JSON with empty nodes array', () => {
    const emptyNodes = { schemaVersion: 1, project: 'Empty', nodes: [], edges: [] };
    const result = importProjectFromJSON(JSON.stringify(emptyNodes));
    expect(result.success).toBe(false);
    expect(result.error).toContain('không chứa nút');
  });
});
