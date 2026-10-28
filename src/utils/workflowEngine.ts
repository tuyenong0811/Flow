import {
  Workflow,
  WorkflowStep,
  Subtask,
  BranchOption,
  ActivePathNode,
} from './workflowTypes';

/**
 * Checks if all required subtasks in a step are completed.
 * In flow-builder mode, steps are never blocked by subtask completion.
 */
export function areRequiredSubtasksDone(_step: WorkflowStep): boolean {
  return true;
}

/**
 * Returns subtask stats for a single step.
 */
export function getStepSubtaskStats(step: WorkflowStep): {
  total: number;
  completed: number;
  requiredTotal: number;
  requiredCompleted: number;
  canProceed: boolean;
  remainingRequiredCount: number;
} {
  const total = step.subtasks.length;
  const requiredTotal = step.subtasks.filter((s) => s.required).length;

  return {
    total,
    completed: total,
    requiredTotal,
    requiredCompleted: requiredTotal,
    canProceed: true,
    remainingRequiredCount: 0,
  };
}

/**
 * Resolves the active path of steps starting from `rootStepId`, following each step's `selectedBranchId`
 * (or defaulting to the first branch option if none is selected yet, so users can preview the default route).
 * Protects against cycles.
 */
export function resolveActivePath(workflow: Workflow): ActivePathNode[] {
  const result: ActivePathNode[] = [];
  const visited = new Set<string>();

  let currentId: string | null = workflow.rootStepId;
  let depth = 0;
  let incomingBranch: BranchOption | null = null;
  let fromStepTitle: string | null = null;

  while (currentId && workflow.steps[currentId] && !visited.has(currentId)) {
    visited.add(currentId);
    const step = workflow.steps[currentId];

    // Choose selected branch, or fallback to first branch if exists
    const activeBranch =
      step.branches.find((b) => b.id === step.selectedBranchId) ||
      (step.branches.length > 0 ? step.branches[0] : null);

    result.push({
      step,
      depth,
      incomingBranch,
      fromStepTitle,
      isCurrent: step.id === workflow.currentStepId,
      isUnlocked: true,
      isStepCompleted: true,
    });

    fromStepTitle = step.title;
    incomingBranch = activeBranch;
    currentId = activeBranch ? activeBranch.targetStepId : null;
    depth += 1;
  }

  return result;
}

/**
 * Calculates structural metrics of the workflow and the currently active situational path.
 */
export function calculateWorkflowProgress(workflow: Workflow): {
  activeStepsCount: number;
  completedStepsCount: number;
  totalSubtasksInPath: number;
  completedSubtasksInPath: number;
  percentage: number;
  totalStepsCount: number;
  totalSubtasksCount: number;
  totalBranchesCount: number;
} {
  const path = resolveActivePath(workflow);
  const activeStepsCount = path.length;
  let totalSubtasksInPath = 0;

  for (const node of path) {
    totalSubtasksInPath += node.step.subtasks.length;
  }

  const allSteps = Object.values(workflow.steps);
  const totalStepsCount = allSteps.length;
  let totalSubtasksCount = 0;
  let totalBranchesCount = 0;

  for (const step of allSteps) {
    totalSubtasksCount += step.subtasks.length;
    totalBranchesCount += step.branches.length;
  }

  return {
    activeStepsCount,
    completedStepsCount: activeStepsCount,
    totalSubtasksInPath,
    completedSubtasksInPath: totalSubtasksInPath,
    percentage: 100,
    totalStepsCount,
    totalSubtasksCount,
    totalBranchesCount,
  };
}

/**
 * Toggles a subtask completion state inside a step.
 */
export function toggleSubtask(
  workflow: Workflow,
  stepId: string,
  subtaskId: string
): Workflow {
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  const updatedSubtasks = step.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st
  );

  const updatedStep: WorkflowStep = {
    ...step,
    subtasks: updatedSubtasks,
  };

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: updatedStep,
    },
  };
}

/**
 * Adds a new prerequisite subtask to a step.
 */
export function addSubtaskToStep(
  workflow: Workflow,
  stepId: string,
  title: string,
  required: boolean = true,
  note?: string
): Workflow {
  const trimmed = title.trim();
  if (!trimmed) return workflow;
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  const newSubtask: Subtask = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: trimmed,
    required,
    completed: false,
    note: note?.trim() || undefined,
  };

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        subtasks: [...step.subtasks, newSubtask],
      },
    },
  };
}

/**
 * Removes a subtask from a step.
 */
export function removeSubtaskFromStep(
  workflow: Workflow,
  stepId: string,
  subtaskId: string
): Workflow {
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        subtasks: step.subtasks.filter((st) => st.id !== subtaskId),
      },
    },
  };
}

/**
 * Changes the situational branch for a step (`selectedBranchId`) and optionally advances
 * `currentStepId` if prerequisites are satisfied.
 */
export function selectSituationBranch(
  workflow: Workflow,
  stepId: string,
  branchId: string,
  advanceFocus: boolean = false
): Workflow {
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  const branch = step.branches.find((b) => b.id === branchId);
  if (!branch) return workflow;

  const canProceed = areRequiredSubtasksDone(step);
  const nextCurrentStepId =
    advanceFocus && canProceed && branch.targetStepId && workflow.steps[branch.targetStepId]
      ? branch.targetStepId
      : workflow.currentStepId;

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    currentStepId: nextCurrentStepId,
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        selectedBranchId: branchId,
      },
    },
  };
}

/**
 * Advances to the next step along the selected branch if and only if all required subtasks are completed.
 */
export function advanceToNextStep(
  workflow: Workflow,
  fromStepId: string
): { workflow: Workflow; success: boolean; errorReason?: string } {
  const step = workflow.steps[fromStepId];
  if (!step) {
    return { workflow, success: false, errorReason: 'Không tìm thấy bước hiện tại.' };
  }

  if (!areRequiredSubtasksDone(step)) {
    const stats = getStepSubtaskStats(step);
    return {
      workflow,
      success: false,
      errorReason: `Cần hoàn thành thêm ${stats.remainingRequiredCount} bước con bắt buộc trước khi chuyển sang bước tiếp theo.`,
    };
  }

  const activeBranch =
    step.branches.find((b) => b.id === step.selectedBranchId) ||
    (step.branches.length > 0 ? step.branches[0] : null);

  if (!activeBranch) {
    return {
      workflow: {
        ...workflow,
        steps: {
          ...workflow.steps,
          [fromStepId]: {
            ...step,
            completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        },
      },
      success: true,
    };
  }

  const nextId = activeBranch.targetStepId;
  return {
    workflow: {
      ...workflow,
      updatedAt: 'Vừa xong',
      currentStepId: nextId && workflow.steps[nextId] ? nextId : fromStepId,
      steps: {
        ...workflow.steps,
        [fromStepId]: {
          ...step,
          selectedBranchId: activeBranch.id,
          completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      },
    },
    success: true,
  };
}

/**
 * Adds a new situational branch option (and optionally creates a new target step if needed)
 * to a given step so users can customize how a situation is resolved.
 */
export function addBranchToStep(
  workflow: Workflow,
  stepId: string,
  payload: {
    label: string;
    conditionDescription: string;
    actionGuidance: string;
    targetMode: 'existing' | 'new' | 'end';
    existingTargetStepId?: string;
    newStepTitle?: string;
    newStepDescription?: string;
    newStepRole?: string;
    newStepSubtasks?: string[];
  }
): Workflow {
  const step = workflow.steps[stepId];
  if (!step || !payload.label.trim()) return workflow;

  let targetStepId: string | null = null;
  const updatedSteps = { ...workflow.steps };

  if (payload.targetMode === 'existing' && payload.existingTargetStepId) {
    targetStepId = payload.existingTargetStepId;
  } else if (payload.targetMode === 'new' && payload.newStepTitle?.trim()) {
    const newId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const stepCount = Object.keys(workflow.steps).length + 1;
    const subtasks: Subtask[] = (payload.newStepSubtasks || [])
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, idx) => ({
        id: `${newId}-st-${idx + 1}`,
        title: t,
        required: true,
        completed: false,
      }));

    if (subtasks.length === 0) {
      subtasks.push({
        id: `${newId}-st-1`,
        title: `Xác nhận hoàn tất: ${payload.newStepTitle.trim()}`,
        required: true,
        completed: false,
      });
    }

    updatedSteps[newId] = {
      id: newId,
      code: `BƯỚC 0${stepCount}`,
      title: payload.newStepTitle.trim(),
      description:
        payload.newStepDescription?.trim() ||
        `Bước xử lý cho tình huống: ${payload.label.trim()}`,
      ownerRole: payload.newStepRole?.trim() || step.ownerRole,
      subtasks,
      branches: [
        {
          id: `br-${newId}-end`,
          label: 'Hoàn tất xử lý nhánh này',
          conditionDescription: 'Tất cả hạng mục trong bước đã được kiểm tra đạt yêu cầu',
          targetStepId: null,
          actionGuidance: 'Đóng hồ sơ tình huống và lưu biên bản thực hiện.',
        },
      ],
      selectedBranchId: `br-${newId}-end`,
    };
    targetStepId = newId;
  }

  const newBranch: BranchOption = {
    id: `br-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    label: payload.label.trim(),
    conditionDescription:
      payload.conditionDescription.trim() || 'Áp dụng khi phát sinh tình huống đặc thù này',
    targetStepId,
    actionGuidance:
      payload.actionGuidance.trim() || 'Thực hiện theo quy trình hướng dẫn của nhánh này.',
  };

  updatedSteps[stepId] = {
    ...step,
    branches: [...step.branches, newBranch],
    selectedBranchId: newBranch.id,
  };

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: updatedSteps,
  };
}

/**
 * Resets all subtask completions in a workflow to start a fresh run.
 */
export function resetWorkflowExecution(workflow: Workflow): Workflow {
  const resetSteps: Record<string, WorkflowStep> = {};
  for (const [id, step] of Object.entries(workflow.steps)) {
    resetSteps[id] = {
      ...step,
      completedAt: undefined,
      subtasks: step.subtasks.map((st) => ({ ...st, completed: false })),
    };
  }
  return {
    ...workflow,
    updatedAt: 'Vừa đặt lại',
    currentStepId: workflow.rootStepId,
    steps: resetSteps,
  };
}

/**
 * Updates basic details of a step (title, description, ownerRole).
 */
export function updateStepDetails(
  workflow: Workflow,
  stepId: string,
  updates: {
    title?: string;
    description?: string;
    ownerRole?: string;
    code?: string;
  }
): Workflow {
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        title: updates.title !== undefined ? updates.title : step.title,
        description: updates.description !== undefined ? updates.description : step.description,
        ownerRole: updates.ownerRole !== undefined ? updates.ownerRole : step.ownerRole,
        code: updates.code !== undefined ? updates.code : step.code,
      },
    },
  };
}

/**
 * Adds a standalone or linked step to the workflow so users can define multi-step graphs.
 */
export function addStepToWorkflow(
  workflow: Workflow,
  payload: {
    title: string;
    description: string;
    ownerRole: string;
    initialSubtasks: string[];
    connectFromStepId?: string;
    connectBranchLabel?: string;
    connectBranchCondition?: string;
  }
): { workflow: Workflow; newStepId: string } {
  const trimmedTitle = payload.title.trim();
  if (!trimmedTitle) return { workflow, newStepId: workflow.currentStepId };

  const stepIndex = Object.keys(workflow.steps).length + 1;
  const newStepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const code = stepIndex < 10 ? `BƯỚC 0${stepIndex}` : `BƯỚC ${stepIndex}`;

  const subtasks: Subtask[] = payload.initialSubtasks
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, idx) => ({
      id: `${newStepId}-st-${idx + 1}`,
      title: s,
      required: true,
      completed: false,
    }));

  if (subtasks.length === 0) {
    subtasks.push({
      id: `${newStepId}-st-1`,
      title: `Hoàn thành kiểm tra: ${trimmedTitle}`,
      required: true,
      completed: false,
    });
  }

  const endBranchId = `br-${newStepId}-end`;
  const newStep: WorkflowStep = {
    id: newStepId,
    code,
    title: trimmedTitle,
    description: payload.description.trim() || `Thực hiện các hạng mục công việc trong ${trimmedTitle}.`,
    ownerRole: payload.ownerRole.trim() || 'Chuyên viên Phụ trách',
    subtasks,
    branches: [
      {
        id: endBranchId,
        label: 'Hoàn tất bước & Kết thúc nhánh',
        conditionDescription: 'Đã hoàn thành tất cả điều kiện trong bước này',
        targetStepId: null,
        actionGuidance: 'Xác nhận kết quả và đóng quy trình hoặc nối thêm bước tiếp theo.',
      },
    ],
    selectedBranchId: endBranchId,
  };

  const updatedSteps: Record<string, WorkflowStep> = {
    ...workflow.steps,
    [newStepId]: newStep,
  };

  if (payload.connectFromStepId && updatedSteps[payload.connectFromStepId]) {
    const parentStep = updatedSteps[payload.connectFromStepId];
    const newBranch: BranchOption = {
      id: `br-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: payload.connectBranchLabel?.trim() || `Chuyển sang: ${trimmedTitle}`,
      conditionDescription:
        payload.connectBranchCondition?.trim() || `Khi cần thực hiện ${trimmedTitle}`,
      targetStepId: newStepId,
      actionGuidance: `Chuyển luồng xử lý sang ${code}: ${trimmedTitle}`,
    };
    updatedSteps[payload.connectFromStepId] = {
      ...parentStep,
      branches: [...parentStep.branches, newBranch],
      selectedBranchId: newBranch.id,
    };
  }

  return {
    workflow: {
      ...workflow,
      updatedAt: 'Vừa xong',
      steps: updatedSteps,
    },
    newStepId,
  };
}

/**
 * Updates or deletes an existing branch option inside a step.
 */
export function removeBranchFromStep(
  workflow: Workflow,
  stepId: string,
  branchId: string
): Workflow {
  const step = workflow.steps[stepId];
  if (!step || step.branches.length <= 1) return workflow;

  const remaining = step.branches.filter((b) => b.id !== branchId);
  const nextSelected =
    step.selectedBranchId === branchId ? remaining[0]?.id ?? null : step.selectedBranchId;

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        branches: remaining,
        selectedBranchId: nextSelected,
      },
    },
  };
}

/**
 * Updates the targetStepId (or label/condition) of an existing branch inside a step.
 */
export function updateBranchTarget(
  workflow: Workflow,
  stepId: string,
  branchId: string,
  targetStepId: string | null
): Workflow {
  const step = workflow.steps[stepId];
  if (!step) return workflow;

  const targetStep = targetStepId ? workflow.steps[targetStepId] : null;
  const updatedBranches = step.branches.map((b) =>
    b.id === branchId
      ? {
          ...b,
          targetStepId,
          actionGuidance: targetStep
            ? `Chuyển luồng xử lý sang ${targetStep.code}: ${targetStep.title}`
            : 'Kết thúc và đóng quy trình sau bước này.',
        }
      : b
  );

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    steps: {
      ...workflow.steps,
      [stepId]: {
        ...step,
        branches: updatedBranches,
      },
    },
  };
}

/**
 * Deletes a step from the workflow (if more than 1 step exists) and cleans up incoming references.
 */
export function deleteStepFromWorkflow(
  workflow: Workflow,
  stepIdToDelete: string
): Workflow {
  const allIds = Object.keys(workflow.steps);
  if (allIds.length <= 1 || !workflow.steps[stepIdToDelete]) {
    return workflow;
  }

  const remainingSteps: Record<string, WorkflowStep> = {};
  for (const [id, step] of Object.entries(workflow.steps)) {
    if (id === stepIdToDelete) continue;
    const cleanedBranches = step.branches.map((br) =>
      br.targetStepId === stepIdToDelete
        ? {
            ...br,
            targetStepId: null,
            actionGuidance: 'Kết thúc quy trình tại nhánh này.',
          }
        : br
    );
    remainingSteps[id] = {
      ...step,
      branches: cleanedBranches,
    };
  }

  const remainingIds = Object.keys(remainingSteps);
  const nextRootId =
    workflow.rootStepId === stepIdToDelete ? remainingIds[0] : workflow.rootStepId;
  const nextCurrentId =
    workflow.currentStepId === stepIdToDelete ? nextRootId : workflow.currentStepId;

  return {
    ...workflow,
    updatedAt: 'Vừa xong',
    rootStepId: nextRootId,
    currentStepId: nextCurrentId,
    steps: remainingSteps,
  };
}

/**
 * Creates a brand new user-defined workflow with an initial root step, prerequisite subtasks,
 * and situational branches.
 */
export function createNewWorkflow(payload: {
  title: string;
  category: string;
  description: string;
  rootStepTitle: string;
  rootStepDescription: string;
  rootStepOwner: string;
  rootSubtasks: string[];
  secondStepTitle?: string;
  secondStepConditionLabel?: string;
  altStepTitle?: string;
  altStepConditionLabel?: string;
}): Workflow {
  const wfId = `wf-${Date.now()}`;
  const rootId = `step-${Date.now()}-1`;
  const step2Id = `step-${Date.now()}-2`;
  const stepAltId = `step-${Date.now()}-3`;

  const rootSubtasks: Subtask[] = payload.rootSubtasks
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({
      id: `${rootId}-st-${i + 1}`,
      title: t,
      required: true,
      completed: false,
    }));

  if (rootSubtasks.length === 0) {
    rootSubtasks.push({
      id: `${rootId}-st-1`,
      title: 'Kiểm tra thông tin đầu vào và điều kiện tiên quyết',
      required: true,
      completed: false,
    });
  }

  const hasSecond = Boolean(payload.secondStepTitle?.trim());
  const hasAlt = Boolean(payload.altStepTitle?.trim());

  const rootBranches: BranchOption[] = [];
  const steps: Record<string, WorkflowStep> = {};

  if (hasSecond) {
    const br1Id = `br-${rootId}-1`;
    rootBranches.push({
      id: br1Id,
      label: payload.secondStepConditionLabel?.trim() || 'Tình huống tiêu chuẩn: Đủ điều kiện tiếp tục',
      conditionDescription: 'Khi kết quả kiểm tra bước đầu đạt chuẩn',
      targetStepId: step2Id,
      actionGuidance: `Chuyển sang thực hiện ${payload.secondStepTitle?.trim()}`,
    });

    steps[step2Id] = {
      id: step2Id,
      code: 'BƯỚC 02A',
      title: payload.secondStepTitle!.trim(),
      description: 'Thực hiện các hạng mục xử lý theo nhánh tiêu chuẩn.',
      ownerRole: payload.rootStepOwner.trim() || 'Chuyên viên Thực hiện',
      subtasks: [
        {
          id: `${step2Id}-st-1`,
          title: `Thực hiện nhiệm vụ chính trong: ${payload.secondStepTitle!.trim()}`,
          required: true,
          completed: false,
        },
        {
          id: `${step2Id}-st-2`,
          title: 'Kiểm tra kết quả và xác nhận hoàn thành bước',
          required: true,
          completed: false,
        },
      ],
      branches: [
        {
          id: `br-${step2Id}-end`,
          label: 'Hoàn tất quy trình nhánh chuẩn',
          conditionDescription: 'Các bước con đã được nghiệm thu đầy đủ',
          targetStepId: null,
          actionGuidance: 'Kết thúc và lưu hồ sơ công việc.',
        },
      ],
      selectedBranchId: `br-${step2Id}-end`,
    };
  }

  if (hasAlt) {
    const br2Id = `br-${rootId}-2`;
    rootBranches.push({
      id: br2Id,
      label:
        payload.altStepConditionLabel?.trim() ||
        'Tình huống phát sinh / Ngoại lệ: Cần hướng xử lý thay thế',
      conditionDescription: 'Khi phát sinh tình huống đặc biệt hoặc cần phê duyệt bổ sung',
      targetStepId: stepAltId,
      actionGuidance: `Rẽ nhánh sang ${payload.altStepTitle?.trim()}`,
    });

    steps[stepAltId] = {
      id: stepAltId,
      code: hasSecond ? 'BƯỚC 02B' : 'BƯỚC 02',
      title: payload.altStepTitle!.trim(),
      description: 'Xử lý tình huống ngoại lệ hoặc thay đổi phương án giải quyết.',
      ownerRole: payload.rootStepOwner.trim() || 'Chuyên viên Xử lý Tình huống',
      subtasks: [
        {
          id: `${stepAltId}-st-1`,
          title: `Đánh giá chi tiết phương án: ${payload.altStepTitle!.trim()}`,
          required: true,
          completed: false,
        },
        {
          id: `${stepAltId}-st-2`,
          title: 'Xác nhận kết quả xử lý ngoại lệ',
          required: true,
          completed: false,
        },
      ],
      branches: [
        {
          id: `br-${stepAltId}-end`,
          label: 'Hoàn tất xử lý nhánh tình huống',
          conditionDescription: 'Tình huống đặc thù đã được giải quyết dứt điểm',
          targetStepId: null,
          actionGuidance: 'Đóng hồ sơ tình huống.',
        },
      ],
      selectedBranchId: `br-${stepAltId}-end`,
    };
  }

  if (rootBranches.length === 0) {
    rootBranches.push({
      id: `br-${rootId}-end`,
      label: 'Hoàn thành quy trình',
      conditionDescription: 'Tất cả bước con tiên quyết đã hoàn tất',
      targetStepId: null,
      actionGuidance: 'Kết thúc quy trình công việc.',
    });
  }

  steps[rootId] = {
    id: rootId,
    code: 'BƯỚC 01',
    title: payload.rootStepTitle.trim() || 'Bước Khởi tạo & Kiểm tra Điều kiện',
    description:
      payload.rootStepDescription.trim() ||
      'Hoàn thành các bước con bắt buộc dưới đây trước khi chọn hướng giải quyết tiếp theo.',
    ownerRole: payload.rootStepOwner.trim() || 'Trưởng nhóm Phụ trách',
    subtasks: rootSubtasks,
    branches: rootBranches,
    selectedBranchId: rootBranches[0].id,
  };

  return {
    id: wfId,
    title: payload.title.trim(),
    category: payload.category.trim() || 'Quy trình Tùy chỉnh',
    description:
      payload.description.trim() ||
      'Quy trình công việc có điều kiện tiên quyết và rẽ nhánh theo tình huống.',
    updatedAt: 'Vừa tạo',
    rootStepId: rootId,
    currentStepId: rootId,
    steps,
  };
}

/**
 * Computes a 2D layered flowchart layout (nodes, coordinates, and directed branch edges)
 * using Longest-Path Topological Layering so that every child step is strictly placed on a
 * deeper row than all of its parent steps, and edge labels never collide with nodes or each other.
 */
function buildRoundedOrthogonalPath(
  points: { x: number; y: number }[],
  cornerRadius = 16
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  // Filter out consecutive duplicate points
  const pts: { x: number; y: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = pts[pts.length - 1];
    if (
      Math.hypot(points[i].x - prev.x, points[i].y - prev.y) > 1
    ) {
      pts.push(points[i]);
    }
  }
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 2 || len2 < 2) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
    const startCornerX = curr.x - (v1x / len1) * r;
    const startCornerY = curr.y - (v1y / len1) * r;
    const endCornerX = curr.x + (v2x / len2) * r;
    const endCornerY = curr.y + (v2y / len2) * r;

    d += ` L ${startCornerX} ${startCornerY} Q ${curr.x} ${curr.y} ${endCornerX} ${endCornerY}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function computeFlowchartLayout(
  workflow: Workflow,
  options?: {
    expandedStepId?: string | null;
    expandedBranchId?: string | null;
  }
): {
  nodes: {
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
  }[];
  edges: {
    id: string;
    fromStepId: string;
    toStepId: string | null;
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
  }[];
  canvasWidth: number;
  canvasHeight: number;
  terminalX: number;
  terminalY: number;
  hasTerminalEdges: boolean;
} {
  const activePath = resolveActivePath(workflow);
  const activeStepIds = new Set(activePath.map((n) => n.step.id));
  const allStepIds = Object.keys(workflow.steps);
  const expandedStepId = options?.expandedStepId ?? null;
  const expandedBranchId = options?.expandedBranchId ?? null;

  // 1. Longest-Path DAG Layer Assignment (ensures every target is strictly below its source)
  const levelsMap = new Map<string, number>();

  function assignDepthDFS(stepId: string, currentDepth: number, pathStack: Set<string>) {
    const existing = levelsMap.get(stepId);
    if (existing !== undefined && existing >= currentDepth) {
      return;
    }
    levelsMap.set(stepId, currentDepth);

    const step = workflow.steps[stepId];
    if (!step) return;

    const nextStack = new Set(pathStack);
    nextStack.add(stepId);

    for (const br of step.branches) {
      const targetId = br.targetStepId;
      if (targetId && workflow.steps[targetId] && !nextStack.has(targetId)) {
        assignDepthDFS(targetId, currentDepth + 1, nextStack);
      }
    }
  }

  if (workflow.rootStepId && workflow.steps[workflow.rootStepId]) {
    assignDepthDFS(workflow.rootStepId, 0, new Set());
  }

  // Handle any disconnected standby steps
  let maxAssignedLevel = 0;
  for (const lvl of levelsMap.values()) {
    if (lvl > maxAssignedLevel) maxAssignedLevel = lvl;
  }
  for (const stepId of allStepIds) {
    if (!levelsMap.has(stepId)) {
      assignDepthDFS(stepId, maxAssignedLevel + 1, new Set());
    }
  }

  // Group steps by level
  const levelGroups = new Map<number, WorkflowStep[]>();
  for (const [stepId, lvl] of levelsMap.entries()) {
    const step = workflow.steps[stepId];
    if (!step) continue;
    const list = levelGroups.get(lvl) || [];
    list.push(step);
    levelGroups.set(lvl, list);
  }

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  let maxCols = 1;
  for (const list of levelGroups.values()) {
    if (list.length > maxCols) maxCols = list.length;
  }

  const BASE_NODE_WIDTH = 300;
  const EXPANDED_NODE_WIDTH = 368;
  const BASE_NODE_HEIGHT = 136;
  const H_GAP = 108;
  const BASE_V_GAP = 168;
  const EXPANDED_BRANCH_V_GAP = 320;
  const PADDING_X = 240; // Ample left/right gutter space so bypass lines never touch nodes
  const PADDING_Y = 48;

  const getNodeDimensions = (step: WorkflowStep) => {
    if (step.id === expandedStepId) {
      const subtaskRowsHeight =
        step.subtasks.length > 0 ? step.subtasks.length * 74 + 54 : 48;
      return {
        width: EXPANDED_NODE_WIDTH,
        height: Math.max(224, 144 + subtaskRowsHeight),
      };
    }
    return {
      width: BASE_NODE_WIDTH,
      height: BASE_NODE_HEIGHT,
    };
  };

  const canvasWidth = Math.max(
    1120,
    maxCols * EXPANDED_NODE_WIDTH + Math.max(0, maxCols - 1) * H_GAP + PADDING_X * 2
  );

  const nodes: {
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
  }[] = [];

  const nodeById = new Map<string, (typeof nodes)[number]>();
  const rowTopY: number[] = [];
  const rowMaxHeight: number[] = [];
  const rowVGap: number[] = [];

  let currentRowY = PADDING_Y;

  sortedLevels.forEach((lvl, rowIdx) => {
    const group = levelGroups.get(lvl) || [];
    group.sort((a, b) => a.code.localeCompare(b.code));
    const count = group.length;
    const dims = group.map((s) => getNodeDimensions(s));
    const rowTotalWidth =
      dims.reduce((acc, d) => acc + d.width, 0) + Math.max(0, count - 1) * H_GAP;
    let currentX = (canvasWidth - rowTotalWidth) / 2;
    const maxH = dims.reduce((m, d) => Math.max(m, d.height), BASE_NODE_HEIGHT);
    const hasExpandedOutgoingBranch = group.some((s) =>
      s.branches.some((b) => b.id === expandedBranchId)
    );
    const vGapForThisRow = hasExpandedOutgoingBranch
      ? EXPANDED_BRANCH_V_GAP
      : BASE_V_GAP;

    rowTopY[rowIdx] = currentRowY;
    rowMaxHeight[rowIdx] = maxH;
    rowVGap[rowIdx] = vGapForThisRow;

    group.forEach((step, colIdx) => {
      const { width, height } = dims[colIdx];
      const layoutNode = {
        step,
        level: rowIdx,
        column: colIdx,
        totalColumnsInLevel: count,
        x: currentX,
        y: currentRowY,
        width,
        height,
        isInActivePath: activeStepIds.has(step.id),
        isCurrent: step.id === workflow.currentStepId,
        isRoot: step.id === workflow.rootStepId,
      };
      currentX += width + H_GAP;
      nodes.push(layoutNode);
      nodeById.set(step.id, layoutNode);
    });

    currentRowY += maxH + vGapForThisRow;
  });

  const totalRows = sortedLevels.length;
  const terminalY = currentRowY;
  const terminalX = canvasWidth / 2;

  // Compute global left and right node bounds so outer gutter lanes never touch any step box
  const minNodeLeft =
    nodes.length > 0
      ? Math.min(...nodes.map((n) => n.x))
      : canvasWidth / 2 - 150;
  const maxNodeRight =
    nodes.length > 0
      ? Math.max(...nodes.map((n) => n.x + n.width))
      : canvasWidth / 2 + 150;

  // Pre-classify all bypass edges (levelDiff > 1 or cyclic) so we can assign non-crossing left/right gutter lanes
  interface BypassEdgeMeta {
    edgeKey: string;
    sourceLevel: number;
    targetLevel: number;
    span: number;
    side: 'left' | 'right';
    laneX: number;
  }

  const bypassList: BypassEdgeMeta[] = [];
  let rootBypassCounter = 0;

  for (const sourceNode of nodes) {
    const step = sourceNode.step;
    step.branches.forEach((br) => {
      const targetNode =
        br.targetStepId && nodeById.has(br.targetStepId)
          ? nodeById.get(br.targetStepId)!
          : null;
      const targetLevel = targetNode ? targetNode.level : totalRows;
      const levelDiff = targetLevel - sourceNode.level;

      if (levelDiff > 1 || levelDiff <= 0) {
        const edgeKey = `${step.id}-${br.id}`;
        let side: 'left' | 'right' = 'right';
        if (sourceNode.level === 0) {
          side = rootBypassCounter % 2 === 0 ? 'left' : 'right';
          rootBypassCounter++;
        } else {
          side =
            sourceNode.x + sourceNode.width / 2 < canvasWidth / 2 - 20
              ? 'left'
              : 'right';
        }
        bypassList.push({
          edgeKey,
          sourceLevel: sourceNode.level,
          targetLevel,
          span: Math.abs(levelDiff),
          side,
          laneX: 0,
        });
      }
    });
  }

  // Sort left bypasses and right bypasses by span ascending:
  // Shorter spans use the inner gutter lane, longer spans use the outer gutter lane so they NEVER cross!
  const leftBypasses = bypassList
    .filter((b) => b.side === 'left')
    .sort((a, b) => a.span - b.span || b.sourceLevel - a.sourceLevel);
  leftBypasses.forEach((b, idx) => {
    b.laneX = Math.max(48, minNodeLeft - 116 - idx * 68);
  });

  const rightBypasses = bypassList
    .filter((b) => b.side === 'right')
    .sort((a, b) => a.span - b.span || b.sourceLevel - a.sourceLevel);
  rightBypasses.forEach((b, idx) => {
    b.laneX = Math.min(canvasWidth - 48, maxNodeRight + 116 + idx * 68);
  });

  const bypassMetaMap = new Map<string, BypassEdgeMeta>();
  for (const b of bypassList) {
    bypassMetaMap.set(b.edgeKey, b);
  }

  const edges: {
    id: string;
    fromStepId: string;
    toStepId: string | null;
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
    corridorTop: number;
    corridorBottom: number;
  }[] = [];

  let hasTerminalEdges = false;

  for (const sourceNode of nodes) {
    const step = sourceNode.step;
    const activeBranchId = step.selectedBranchId || step.branches[0]?.id || null;
    const branchCount = step.branches.length;
    const corridorTop = rowTopY[sourceNode.level] + rowMaxHeight[sourceNode.level];
    const corridorGap = rowVGap[sourceNode.level] || BASE_V_GAP;
    const corridorBottom = corridorTop + corridorGap;

    const getBranchChannelX = (br: BranchOption) => {
      const edgeKey = `${step.id}-${br.id}`;
      const bypass = bypassMetaMap.get(edgeKey);
      if (bypass) {
        return bypass.laneX;
      }
      if (br.targetStepId && nodeById.has(br.targetStepId)) {
        const tNode = nodeById.get(br.targetStepId)!;
        return tNode.x + tNode.width / 2;
      }
      return terminalX;
    };

    const sortedBranches = [...step.branches].sort(
      (a, b) => getBranchChannelX(a) - getBranchChannelX(b)
    );

    const directBranches = sortedBranches.filter(
      (br) => !bypassMetaMap.has(`${step.id}-${br.id}`)
    );

    sortedBranches.forEach((br, idx) => {
      const isSelectedBranch = br.id === activeBranchId;
      const isOnActivePath = sourceNode.isInActivePath && isSelectedBranch;
      const edgeKey = `${step.id}-${br.id}`;
      const bypass = bypassMetaMap.get(edgeKey);
      const isThisBranchExpanded = br.id === expandedBranchId;

      let offsetRatio =
        branchCount === 1 ? 0.5 : 0.18 + (idx / (branchCount - 1)) * 0.64;

      if (bypass) {
        offsetRatio = bypass.side === 'left' ? 0.18 : 0.82;
      } else if (directBranches.length === 1) {
        offsetRatio = 0.5;
      }

      const startX = sourceNode.x + sourceNode.width * offsetRatio;
      const startY = sourceNode.y + sourceNode.height;

      const isTerminal = !br.targetStepId || !nodeById.has(br.targetStepId);
      if (isTerminal) {
        hasTerminalEdges = true;
      }

      const targetNode = !isTerminal ? nodeById.get(br.targetStepId!)! : null;
      const targetLevel = targetNode ? targetNode.level : totalRows;

      let endX = targetNode ? targetNode.x + targetNode.width / 2 : terminalX;
      const endY = targetNode ? targetNode.y : terminalY;

      if (bypass) {
        const laneX = bypass.laneX;
        if (targetNode) {
          endX =
            bypass.side === 'left'
              ? targetNode.x + targetNode.width * 0.22
              : targetNode.x + targetNode.width * 0.78;
        } else {
          endX =
            bypass.side === 'left' ? terminalX - 56 : terminalX + 56;
        }

        const exitTurnY = isThisBranchExpanded
          ? corridorTop + 136
          : corridorTop + 52;
        const prevRowIdx = Math.max(0, targetLevel - 1);
        const entryCorridorTop =
          rowTopY[prevRowIdx] + rowMaxHeight[prevRowIdx];
        const entryCorridorGap = rowVGap[prevRowIdx] || BASE_V_GAP;
        const entryTurnY = entryCorridorTop + entryCorridorGap * 0.76;

        const pathD = buildRoundedOrthogonalPath(
          [
            { x: startX, y: startY },
            { x: startX, y: exitTurnY },
            { x: laneX, y: exitTurnY },
            { x: laneX, y: entryTurnY },
            { x: endX, y: entryTurnY },
            { x: endX, y: endY },
          ],
          18
        );

        const labelX = isThisBranchExpanded
          ? startX * 0.12 + laneX * 0.88
          : startX * 0.35 + laneX * 0.65;
        const labelY = exitTurnY;

        edges.push({
          id: isTerminal ? `${step.id}-${br.id}-end` : `${step.id}-${br.id}`,
          fromStepId: step.id,
          toStepId: isTerminal ? null : br.targetStepId,
          branch: br,
          isSelectedBranch,
          isOnActivePath,
          startX,
          startY,
          endX,
          endY,
          pathD,
          labelX,
          labelY,
          corridorTop,
          corridorBottom,
        });
      } else {
        const turnY = isThisBranchExpanded
          ? corridorTop + corridorGap * 0.56
          : corridorTop + corridorGap * 0.54;
        const pathD =
          Math.abs(startX - endX) < 8
            ? `M ${startX} ${startY} L ${endX} ${endY}`
            : buildRoundedOrthogonalPath(
                [
                  { x: startX, y: startY },
                  { x: startX, y: turnY },
                  { x: endX, y: turnY },
                  { x: endX, y: endY },
                ],
                16
              );

        const labelX = (startX + endX) / 2;
        const labelY = turnY;

        edges.push({
          id: isTerminal ? `${step.id}-${br.id}-end` : `${step.id}-${br.id}`,
          fromStepId: step.id,
          toStepId: isTerminal ? null : br.targetStepId,
          branch: br,
          isSelectedBranch,
          isOnActivePath,
          startX,
          startY,
          endX,
          endY,
          pathD,
          labelX,
          labelY,
          corridorTop,
          corridorBottom,
        });
      }
    });
  }

  // 2. Final Label Anti-Collision Pass with strict Corridor Clamping so labels never overlap nodes
  const getLabelBox = (edge: (typeof edges)[number]) =>
    edge.branch.id === expandedBranchId
      ? { w: 324, h: 216 }
      : { w: 236, h: 38 };

  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i];
        const b = edges[j];
        const boxA = getLabelBox(a);
        const boxB = getLabelBox(b);
        const minW = (boxA.w + boxB.w) / 2 + 10;
        const minH = (boxA.h + boxB.h) / 2 + 8;
        const dx = Math.abs(a.labelX - b.labelX);
        const dy = Math.abs(a.labelY - b.labelY);
        if (dx < minW && dy < minH) {
          const pushY = (minH - dy) / 2 + 2;
          if (a.labelY <= b.labelY) {
            a.labelY -= pushY;
            b.labelY += pushY;
          } else {
            a.labelY += pushY;
            b.labelY -= pushY;
          }
        }
      }
    }
    // Clamp each label strictly inside its inter-row corridor so it never touches any step box above or below
    for (const edge of edges) {
      const box = getLabelBox(edge);
      const minY = edge.corridorTop + box.h / 2 + 20;
      const maxY = edge.corridorBottom - box.h / 2 - 20;
      if (minY <= maxY) {
        edge.labelY = Math.max(minY, Math.min(maxY, edge.labelY));
      }
    }
  }

  const lastRowBottom =
    rowTopY.length > 0
      ? rowTopY[rowTopY.length - 1] + rowMaxHeight[rowMaxHeight.length - 1]
      : 320;
  const canvasHeight = hasTerminalEdges
    ? terminalY + 96
    : Math.max(380, lastRowBottom + PADDING_Y);

  return {
    nodes,
    edges,
    canvasWidth,
    canvasHeight,
    terminalX,
    terminalY,
    hasTerminalEdges,
  };
}

/**
 * Parses a multi-line outline of steps entered by the user to automatically build a complete
 * workflow and draw its flowchart diagram.
 */
export function generateWorkflowFromStepsText(payload: {
  title: string;
  category: string;
  rawStepsText: string;
}): Workflow {
  const lines = payload.rawStepsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  interface ParsedStepDraft {
    id: string;
    code: string;
    title: string;
    subtasks: string[];
    explicitBranches: { conditionLabel: string; targetTitle: string }[];
  }

  const drafts: ParsedStepDraft[] = [];
  const baseTs = Date.now();

  for (const line of lines) {
    if (/^[-*+]\s+/.test(line)) {
      const subText = line.replace(/^[-*+]\s+/, '').trim();
      if (subText) {
        if (drafts.length === 0) {
          drafts.push({
            id: `step-${baseTs}-1`,
            code: 'BƯỚC 01',
            title: 'Bước Khởi tạo Quy trình',
            subtasks: [subText],
            explicitBranches: [],
          });
        } else {
          drafts[drafts.length - 1].subtasks.push(subText);
        }
      }
      continue;
    }

    if (/^(->|=>|\?)\s*/.test(line)) {
      const rawBranch = line.replace(/^(->|=>|\?)\s*/, '').trim();
      if (rawBranch && drafts.length > 0) {
        const parts = rawBranch.split(/(?::|->|=>)/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          drafts[drafts.length - 1].explicitBranches.push({
            conditionLabel: parts[0],
            targetTitle: parts.slice(1).join(': '),
          });
        } else {
          drafts[drafts.length - 1].explicitBranches.push({
            conditionLabel: rawBranch,
            targetTitle: '',
          });
        }
      }
      continue;
    }

    const cleanTitle = line
      .replace(/^(?:bước\s*\d+[a-z]?|step\s*\d+|\d+)[.:)-]\s*/i, '')
      .trim();

    if (cleanTitle) {
      const idx = drafts.length + 1;
      drafts.push({
        id: `step-${baseTs}-${idx}`,
        code: idx < 10 ? `BƯỚC 0${idx}` : `BƯỚC ${idx}`,
        title: cleanTitle,
        subtasks: [],
        explicitBranches: [],
      });
    }
  }

  if (drafts.length === 0) {
    drafts.push({
      id: `step-${baseTs}-1`,
      code: 'BƯỚC 01',
      title: 'Tiếp nhận & Kiểm tra Điều kiện Đầu vào',
      subtasks: ['Xác nhận thông tin yêu cầu đầy đủ'],
      explicitBranches: [],
    });
  }

  const findDraftByTitle = (titleQuery: string): ParsedStepDraft | undefined => {
    const norm = titleQuery.toLowerCase().trim();
    if (!norm) return undefined;
    return drafts.find(
      (d) =>
        d.title.toLowerCase() === norm ||
        d.title.toLowerCase().includes(norm) ||
        norm.includes(d.title.toLowerCase())
    );
  };

  const initialDraftCount = drafts.length;
  for (let i = 0; i < initialDraftCount; i++) {
    const d = drafts[i];
    for (const eb of d.explicitBranches) {
      if (eb.targetTitle && !findDraftByTitle(eb.targetTitle)) {
        const idx = drafts.length + 1;
        drafts.push({
          id: `step-${baseTs}-${idx}`,
          code: idx < 10 ? `BƯỚC 0${idx}` : `BƯỚC ${idx}`,
          title: eb.targetTitle,
          subtasks: [`Thực hiện xử lý: ${eb.targetTitle}`],
          explicitBranches: [],
        });
      }
    }
  }

  // Track which steps are already targeted by explicit multi-way branches (sibling branches)
  const siblingBranchTargets = new Set<string>();
  for (const d of drafts) {
    if (d.explicitBranches.length >= 2) {
      for (const eb of d.explicitBranches) {
        const matched = findDraftByTitle(eb.targetTitle);
        if (matched) {
          siblingBranchTargets.add(matched.id);
        }
      }
    }
  }

  const stepsMap: Record<string, WorkflowStep> = {};

  drafts.forEach((d, idx) => {
    const subtasks: Subtask[] =
      d.subtasks.length > 0
        ? d.subtasks.map((st, sIdx) => ({
            id: `${d.id}-st-${sIdx + 1}`,
            title: st,
            required: true,
            completed: false,
          }))
        : [
            {
              id: `${d.id}-st-1`,
              title: `Hoàn thành kiểm tra & thực thi: ${d.title}`,
              required: true,
              completed: false,
            },
          ];

    const branches: BranchOption[] = [];
    const nextDraft = drafts[idx + 1];

    // If this step has explicit branches, use them
    if (d.explicitBranches.length > 0) {
      d.explicitBranches.forEach((eb, bIdx) => {
        const matchedTarget = findDraftByTitle(eb.targetTitle);
        const targetId = matchedTarget
          ? matchedTarget.id
          : eb.targetTitle
            ? null
            : nextDraft?.id || null;

        branches.push({
          id: `br-${d.id}-${bIdx + 1}`,
          label: eb.conditionLabel,
          conditionDescription: `Khi xảy ra tình huống: ${eb.conditionLabel}`,
          targetStepId: targetId,
          actionGuidance: matchedTarget
            ? `Chuyển sang ${matchedTarget.code}: ${matchedTarget.title}`
            : 'Thực hiện theo hướng xử lý của tình huống này.',
        });
      });
    } else if (
      nextDraft &&
      !(siblingBranchTargets.has(d.id) && siblingBranchTargets.has(nextDraft.id))
    ) {
      // Only auto-connect sequentially if they are not parallel sibling branch destinations
      branches.push({
        id: `br-${d.id}-next`,
        label: `Chuyển sang ${nextDraft.code}`,
        conditionDescription: `Hoàn tất toàn bộ bước con bắt buộc của ${d.code}`,
        targetStepId: nextDraft.id,
        actionGuidance: `Tiếp tục thực hiện ${nextDraft.title}`,
      });
    } else {
      branches.push({
        id: `br-${d.id}-end`,
        label: 'Hoàn tất nhánh xử lý',
        conditionDescription: 'Tất cả hạng mục kiểm tra trong bước đã đạt yêu cầu',
        targetStepId: null,
        actionGuidance: 'Kết thúc và đóng hồ sơ quy trình.',
      });
    }

    stepsMap[d.id] = {
      id: d.id,
      code: d.code,
      title: d.title,
      description: `Bước công việc được khởi tạo từ danh sách liệt kê (${subtasks.length} bước con tiên quyết).`,
      ownerRole: 'Chuyên viên Thực hiện',
      subtasks,
      branches,
      selectedBranchId: branches[0]?.id || null,
    };
  });

  const rootId = drafts[0].id;
  return {
    id: `wf-listed-${baseTs}`,
    title: payload.title.trim() || 'Quy trình Tự động Vẽ từ Danh sách Bước',
    category: payload.category.trim() || 'Sơ đồ Quy trình Tùy chỉnh',
    description: `Quy trình gồm ${drafts.length} bước được sinh tự động kèm sơ đồ luồng trực quan từ các bước người dùng liệt kê.`,
    updatedAt: 'Vừa vẽ sơ đồ',
    rootStepId: rootId,
    currentStepId: rootId,
    steps: stepsMap,
  };
}

export interface WorkflowExportPackage {
  schemaVersion: string;
  application: string;
  exportedAt: string;
  usageGuide: {
    purpose: string;
    howToBackup: string;
    howToShare: string;
    howToRestore: string;
    schemaOverview: {
      rootStepId: string;
      steps: string;
      subtasks: string;
      branches: string;
    };
  };
  workflow: Workflow;
}

/**
 * Serializes a Workflow into a formatted JSON backup/share package with a safe filename and usage guide.
 */
export function serializeWorkflowToJson(workflow: Workflow): {
  filename: string;
  jsonContent: string;
  packageData: WorkflowExportPackage;
} {
  const slug = workflow.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'quy-trinh';

  const filename = `flowops-${slug}.json`;

  const packageData: WorkflowExportPackage = {
    schemaVersion: '1.0',
    application: 'FlowOps Studio',
    exportedAt: new Date().toISOString(),
    usageGuide: {
      purpose:
        'File JSON này chứa toàn bộ cấu trúc quy trình công việc hiện tại (các bước, bước con tiên quyết và các nhánh xử lý tình huống).',
      howToBackup:
        'Lưu trữ file .json này trên máy tính, Google Drive hoặc kho tài liệu nội bộ để làm bản sao lưu chuẩn.',
      howToShare:
        'Gửi file .json hoặc sao chép nội dung JSON cho đồng nghiệp để chia sẻ toàn bộ luồng bước và sơ đồ quy trình.',
      howToRestore:
        'Trong ứng dụng FlowOps Studio, mở hộp thoại "Xuất / Nhập JSON & Hướng dẫn" và chọn file .json này (hoặc dán nội dung JSON) để khôi phục nguyên vẹn quy trình.',
      schemaOverview: {
        rootStepId: 'ID của bước mở đầu quy trình (Bước 01).',
        steps: 'Danh sách các bước trong quy trình (mã bước, tiêu đề, vai trò phụ trách).',
        subtasks: 'Mảng các bước con cần thực hiện bên trong từng bước chính.',
        branches:
          'Mảng các tình huống rẽ nhánh (label, conditionDescription, actionGuidance, targetStepId).',
      },
    },
    workflow,
  };

  return {
    filename,
    jsonContent: JSON.stringify(packageData, null, 2),
    packageData,
  };
}

/**
 * Parses and validates an imported JSON string (either a WorkflowExportPackage or a raw Workflow)
 * and returns a sanitized Workflow ready to be added to the workspace.
 */
export function parseImportedWorkflowJson(rawJson: string): Workflow {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại định dạng file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Dữ liệu JSON không đúng cấu trúc quy trình.');
  }

  const candidate =
    'workflow' in parsed &&
    parsed.workflow &&
    typeof parsed.workflow === 'object'
      ? (parsed.workflow as Partial<Workflow>)
      : (parsed as Partial<Workflow>);

  if (
    !candidate.title ||
    typeof candidate.title !== 'string' ||
    !candidate.steps ||
    typeof candidate.steps !== 'object'
  ) {
    throw new Error(
      'File JSON thiếu trường bắt buộc (title hoặc steps). Vui lòng chọn đúng file JSON xuất từ FlowOps Studio.'
    );
  }

  const stepEntries = Object.entries(candidate.steps);
  if (stepEntries.length === 0) {
    throw new Error('Quy trình trong file JSON không chứa bước công việc nào.');
  }

  const firstStepId = stepEntries[0][0];
  const rootStepId =
    candidate.rootStepId && candidate.steps[candidate.rootStepId]
      ? candidate.rootStepId
      : firstStepId;

  const currentStepId =
    candidate.currentStepId && candidate.steps[candidate.currentStepId]
      ? candidate.currentStepId
      : rootStepId;

  return {
    id: `wf-import-${Date.now()}`,
    title: candidate.title.trim(),
    category:
      typeof candidate.category === 'string' && candidate.category.trim()
        ? candidate.category.trim()
        : 'Quy trình Nhập từ JSON',
    description:
      typeof candidate.description === 'string'
        ? candidate.description
        : '',
    updatedAt: 'Vừa nhập từ JSON',
    rootStepId,
    currentStepId,
    steps: candidate.steps,
  };
}
