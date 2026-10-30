import { GraphNode, GraphEdge, ProjectGraph } from './types';
import { GeneratedTask } from './tasks';

export const CURRENT_SCHEMA_VERSION = 1;

export interface ProjectExportData {
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  project: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  tasks?: GeneratedTask[];
}

export interface ImportResult {
  success: boolean;
  data?: ProjectExportData;
  error?: string;
  migratedFromVersion?: number;
}

/**
 * Serializes the current project graph and tasks into a versioned JSON string.
 */
export function exportProjectToJSON(
  project: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  tasks: GeneratedTask[] = []
): string {
  const exportPayload: ProjectExportData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    nodes,
    edges,
    tasks
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Validates and migrates raw JSON input into the latest ProjectExportData structure.
 * Supports legacy formats (like raw seed.json without schemaVersion).
 */
export function migrateProjectData(raw: any): { data: ProjectExportData; migratedFromVersion: number } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dữ liệu không phải là đối tượng JSON hợp lệ.');
  }

  // Check if it's already a modern versioned schema
  if (typeof raw.schemaVersion === 'number') {
    if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
      throw new Error('Cấu trúc file thiếu mảng nodes hoặc edges.');
    }
    return {
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: raw.exportedAt || new Date().toISOString(),
        project: typeof raw.project === 'string' ? raw.project : 'Untitled Project',
        nodes: raw.nodes,
        edges: raw.edges,
        tasks: Array.isArray(raw.tasks) ? raw.tasks : []
      },
      migratedFromVersion: raw.schemaVersion
    };
  }

  // Legacy schema: e.g. seed.json with { project, nodes, edges } without schemaVersion
  if (Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
    return {
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        project: typeof raw.project === 'string' ? raw.project : 'Migrated Project',
        nodes: raw.nodes,
        edges: raw.edges,
        tasks: Array.isArray(raw.tasks) ? raw.tasks : []
      },
      migratedFromVersion: 0
    };
  }

  throw new Error('Định dạng JSON không chứa dữ liệu đồ thị hợp lệ (cần các trường project, nodes, edges).');
}

/**
 * Parses and validates an imported JSON string.
 * Gracefully handles syntax errors and schema migrations.
 */
export function importProjectFromJSON(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString);
    const { data, migratedFromVersion } = migrateProjectData(parsed);

    // Basic structural verification
    if (!data.nodes || data.nodes.length === 0) {
      return {
        success: false,
        error: 'File nhập không chứa nút (node) nào.'
      };
    }

    return {
      success: true,
      data,
      migratedFromVersion
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi phân tích cú pháp JSON không hợp lệ.'
    };
  }
}
