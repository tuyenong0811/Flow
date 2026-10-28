export interface Subtask {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
  note?: string;
}

export interface BranchOption {
  id: string;
  label: string; // e.g. "Tình huống chuẩn", "Khẩn cấp / Lỗi nghiêm trọng", "Khách hàng tự xử lý được"
  conditionDescription: string; // Mô tả cụ thể tình huống khi nào chọn hướng này
  targetStepId: string | null; // null nghĩa là kết thúc quy trình tại đây
  actionGuidance: string; // Hướng dẫn giải quyết bổ sung khi rẽ sang hướng này
}

export interface WorkflowStep {
  id: string;
  code: string; // e.g. "BƯỚC 01", "BƯỚC 02A"
  title: string;
  description: string;
  ownerRole: string;
  subtasks: Subtask[];
  branches: BranchOption[];
  selectedBranchId: string | null;
  completedAt?: string;
  executionNote?: string;
}

export interface Workflow {
  id: string;
  title: string;
  category: string;
  description: string;
  updatedAt: string;
  rootStepId: string;
  currentStepId: string;
  steps: Record<string, WorkflowStep>;
}

export interface ActivePathNode {
  step: WorkflowStep;
  depth: number;
  incomingBranch: BranchOption | null;
  fromStepTitle: string | null;
  isCurrent: boolean;
  isUnlocked: boolean;
  isStepCompleted: boolean;
}

export interface FlowchartNodeLayout {
  step: WorkflowStep;
  level: number;
  column: number;
  totalColumnsInLevel: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isInActivePath: boolean;
  isCurrent: boolean;
  isRoot: boolean;
}

export interface FlowchartEdgeLayout {
  id: string;
  fromStepId: string;
  toStepId: string | null; // null means Terminal End node
  branch: BranchOption;
  isSelectedBranch: boolean;
  isOnActivePath: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string;
  labelX: number;
  labelY: number;
}

export interface FlowchartLayout {
  nodes: FlowchartNodeLayout[];
  edges: FlowchartEdgeLayout[];
  canvasWidth: number;
  canvasHeight: number;
  terminalX: number;
  terminalY: number;
  hasTerminalEdges: boolean;
}


