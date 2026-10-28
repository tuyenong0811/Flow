/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Workflow } from './utils/workflowTypes';
import { INITIAL_WORKFLOWS } from './utils/seedWorkflows';
import { AppLanguage, UI_TRANSLATIONS } from './utils/i18n';
import {
  resolveActivePath,
  calculateWorkflowProgress,
  addSubtaskToStep,
  removeSubtaskFromStep,
  selectSituationBranch,
  addBranchToStep,
  removeBranchFromStep,
  updateBranchTarget,
  updateStepDetails,
  deleteStepFromWorkflow,
  createNewWorkflow,
  addStepToWorkflow,
  generateWorkflowFromStepsText,
} from './utils/workflowEngine';
import { ActivePathTimeline } from './components/ActivePathTimeline';
import { StepExecutionPanel } from './components/StepExecutionPanel';
import { DecisionMatrixView } from './components/DecisionMatrixView';
import { ProcessFlowchartView } from './components/ProcessFlowchartView';
import { CreateWorkflowModal } from './components/CreateWorkflowModal';
import { AddStepModal } from './components/AddStepModal';
import { ExportWorkflowModal } from './components/ExportWorkflowModal';
import {
  Search,
  GitBranch,
  FolderKanban,
  Trash2,
  ListTree,
  Plus,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Languages,
  FileJson,
} from 'lucide-react';

const STORAGE_KEY = 'flow_situational_workflows_v1';
const THEME_STORAGE_KEY = 'flowops_theme_v1';
const LANG_STORAGE_KEY = 'flowops_lang_v1';

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seed data
    }
    return INITIAL_WORKFLOWS;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [lang, setLang] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'zh-TW' || saved === 'vi') return saved;
    } catch {
      // default vi
    }
    return 'vi';
  });

  const t = UI_TRANSLATIONS[lang];

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    () => workflows[0]?.id || INITIAL_WORKFLOWS[0].id
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'execution' | 'flowchart' | 'matrix'>('execution');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Quick Empty-State Step Outline Input
  const [quickTitle, setQuickTitle] = useState('Quy trình Xử lý Công việc Mới');
  const [quickStepsText, setQuickStepsText] = useState(
    `Bước 1: Tiếp nhận & Kiểm tra Hồ sơ Đầu vào\n- Kiểm tra tính đầy đủ của tài liệu đính kèm\n- Xác nhận người phụ trách xử lý\n-> Hồ sơ hợp lệ: Phê duyệt & Triển khai Thực hiện\n-> Hồ sơ thiếu thông tin: Yêu cầu Bổ sung & Hiệu chỉnh\n\nBước 2: Phê duyệt & Triển khai Thực hiện\n- Ký duyệt phiếu giao việc\n- Cập nhật trạng thái hoàn tất lên hệ thống\n\nBước 3: Yêu cầu Bổ sung & Hiệu chỉnh\n- Gửi danh mục các mục cần bổ sung cho người gửi\n- Kiểm tra lại sau khi nhận bản cập nhật`
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    } catch {
      // Ignore storage quota errors
    }
  }, [workflows]);

  const currentWorkflow: Workflow | null = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) || workflows[0] || null,
    [workflows, selectedWorkflowId]
  );

  const activePath = useMemo(
    () => (currentWorkflow ? resolveActivePath(currentWorkflow) : []),
    [currentWorkflow]
  );

  const progress = useMemo(
    () =>
      currentWorkflow
        ? calculateWorkflowProgress(currentWorkflow)
        : {
            activeStepsCount: 0,
            completedStepsCount: 0,
            totalSubtasksInPath: 0,
            completedSubtasksInPath: 0,
            percentage: 100,
            totalStepsCount: 0,
            totalSubtasksCount: 0,
            totalBranchesCount: 0,
          },
    [currentWorkflow]
  );

  const selectedStepId = currentWorkflow
    ? currentWorkflow.steps[currentWorkflow.currentStepId]
      ? currentWorkflow.currentStepId
      : currentWorkflow.rootStepId
    : '';

  const selectedStep = currentWorkflow ? currentWorkflow.steps[selectedStepId] : null;

  const filteredWorkflows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
    );
  }, [workflows, searchQuery]);

  const updateCurrentWorkflow = (updater: (wf: Workflow) => Workflow) => {
    if (!currentWorkflow) return;
    setWorkflows((prev) =>
      prev.map((w) => (w.id === currentWorkflow.id ? updater(w) : w))
    );
  };

  const handleSelectWorkflow = (wfId: string) => {
    setSelectedWorkflowId(wfId);
    setStatusBanner(null);
  };

  const handleDeleteCurrentWorkflow = () => {
    if (!currentWorkflow) return;
    const deletedTitle = currentWorkflow.title;
    const remaining = workflows.filter((w) => w.id !== currentWorkflow.id);
    setWorkflows(remaining);
    if (remaining.length > 0) {
      setSelectedWorkflowId(remaining[0].id);
    } else {
      setSelectedWorkflowId('');
    }
    setStatusBanner({
      type: 'success',
      message: `Đã xóa quy trình "${deletedTitle}".`,
    });
  };

  const handleDeleteAllWorkflows = () => {
    setWorkflows([]);
    setSelectedWorkflowId('');
    setConfirmClearAll(false);
    setStatusBanner({
      type: 'success',
      message: 'Đã xóa toàn bộ quy trình công việc. Bạn có thể tạo mới hoặc nhập danh sách bước để vẽ sơ đồ.',
    });
  };

  const handleRestoreSampleWorkflows = () => {
    setWorkflows(INITIAL_WORKFLOWS);
    setSelectedWorkflowId(INITIAL_WORKFLOWS[0].id);
    setStatusBanner({
      type: 'success',
      message: 'Đã khôi phục 3 quy trình mẫu.',
    });
  };

  const handleSelectStep = (stepId: string) => {
    updateCurrentWorkflow((wf) => ({
      ...wf,
      currentStepId: stepId,
    }));
    setStatusBanner(null);
  };

  const handleAddSubtask = (
    stepId: string,
    title: string,
    required: boolean,
    note?: string
  ) => {
    updateCurrentWorkflow((wf) => addSubtaskToStep(wf, stepId, title, required, note));
    setStatusBanner({
      type: 'success',
      message: `Đã thêm bước con "${title.trim()}" vào bước hiện tại.`,
    });
  };

  const handleRemoveSubtask = (stepId: string, subtaskId: string) => {
    updateCurrentWorkflow((wf) => removeSubtaskFromStep(wf, stepId, subtaskId));
  };

  const handleSelectBranch = (
    stepId: string,
    branchId: string,
    advanceFocus: boolean = false
  ) => {
    if (!currentWorkflow) return;
    const step = currentWorkflow.steps[stepId];
    const branch = step?.branches.find((b) => b.id === branchId);
    updateCurrentWorkflow((wf) =>
      selectSituationBranch(wf, stepId, branchId, advanceFocus)
    );
    if (branch) {
      const destStep = branch.targetStepId
        ? currentWorkflow.steps[branch.targetStepId]
        : null;
      setStatusBanner({
        type: 'success',
        message: destStep
          ? `Đã chuyển nhánh tình huống sang "${branch.label}" → Bước nối tiếp: ${destStep.code} (${destStep.title}).`
          : `Đã chọn nhánh "${branch.label}" → Kết thúc quy trình sau bước này.`,
      });
    }
  };

  const handleUpdateBranchTarget = (
    stepId: string,
    branchId: string,
    targetStepId: string | null
  ) => {
    if (!currentWorkflow) return;
    updateCurrentWorkflow((wf) =>
      updateBranchTarget(wf, stepId, branchId, targetStepId)
    );
    const destStep = targetStepId ? currentWorkflow.steps[targetStepId] : null;
    setStatusBanner({
      type: 'success',
      message: destStep
        ? `Đã cập nhật đích đến của nhánh sang ${destStep.code}: ${destStep.title}.`
        : 'Đã cập nhật nhánh thành kết thúc quy trình sau bước này.',
    });
  };

  const handleUpdateStepDetails = (
    stepId: string,
    updates: { title?: string; description?: string; ownerRole?: string; code?: string }
  ) => {
    updateCurrentWorkflow((wf) => updateStepDetails(wf, stepId, updates));
    setStatusBanner({
      type: 'success',
      message: 'Đã lưu cập nhật thông tin bước công việc.',
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!currentWorkflow) return;
    const stepName = currentWorkflow.steps[stepId]?.title || '';
    updateCurrentWorkflow((wf) => deleteStepFromWorkflow(wf, stepId));
    setStatusBanner({
      type: 'success',
      message: `Đã xóa bước "${stepName}" khỏi quy trình.`,
    });
  };

  const handleAddBranch = (
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
  ) => {
    updateCurrentWorkflow((wf) => addBranchToStep(wf, stepId, payload));
    setStatusBanner({
      type: 'success',
      message: `Đã thêm tình huống "${payload.label.trim()}" và cập nhật luồng quy trình.`,
    });
  };

  const handleRemoveBranch = (stepId: string, branchId: string) => {
    updateCurrentWorkflow((wf) => removeBranchFromStep(wf, stepId, branchId));
  };

  const handleCreateWorkflow = (payload: Parameters<typeof createNewWorkflow>[0]) => {
    const newWf = createNewWorkflow(payload);
    setWorkflows((prev) => [newWf, ...prev]);
    setSelectedWorkflowId(newWf.id);
    setStatusBanner({
      type: 'success',
      message: `Đã khởi tạo quy trình mới "${newWf.title}" với đầy đủ bước con và nhánh tình huống.`,
    });
  };

  const handleImportWorkflow = (importedWf: Workflow) => {
    setWorkflows((prev) => {
      const exists = prev.some((w) => w.id === importedWf.id);
      if (exists) {
        const clonedId = `${importedWf.id}-restored-${Date.now()}`;
        const restoredWf: Workflow = {
          ...importedWf,
          id: clonedId,
        };
        setSelectedWorkflowId(clonedId);
        return [restoredWf, ...prev];
      }
      setSelectedWorkflowId(importedWf.id);
      return [importedWf, ...prev];
    });
    setIsExportModalOpen(false);
    setStatusBanner({
      type: 'success',
      message: `Đã nhập và khôi phục thành công quy trình "${importedWf.title}" từ file JSON.`,
    });
  };

  const handleGenerateFromStepsText = (payload: {
    title: string;
    category: string;
    rawStepsText: string;
  }) => {
    const newWf = generateWorkflowFromStepsText(payload);
    setWorkflows((prev) => [newWf, ...prev]);
    setSelectedWorkflowId(newWf.id);
    setActiveTab('flowchart');
    setStatusBanner({
      type: 'success',
      message: `Đã tự động dựng quy trình "${newWf.title}" (${Object.keys(newWf.steps).length} bước) và vẽ sơ đồ luồng trực quan.`,
    });
  };

  const handleAddStep = (payload: Parameters<typeof addStepToWorkflow>[1]) => {
    if (!currentWorkflow) return;
    const { workflow: updated, newStepId } = addStepToWorkflow(
      currentWorkflow,
      payload
    );
    setWorkflows((prev) =>
      prev.map((w) => (w.id === currentWorkflow.id ? updated : w))
    );
    setStatusBanner({
      type: 'success',
      message: `Đã thêm bước "${payload.title.trim()}" vào quy trình.`,
    });
    if (newStepId && activeTab === 'execution') {
      handleSelectStep(newStepId);
    }
  };

  const activeStepIdsSet = useMemo(
    () => new Set(activePath.map((n) => n.step.id)),
    [activePath]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Compact Top Bar: Brand + 3 Core View Tabs + Language & Dark Mode + Primary CTA */}
      <header className="flex items-center justify-between gap-4 px-4 py-2.5 bg-white border-b border-slate-200 sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('execution');
          }}
          className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>FlowOps Studio</span>
        </a>

        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium"
        >
          <a
            href="#execution"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('execution');
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'execution'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.navExecution}
          </a>
          <a
            href="#flowchart"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('flowchart');
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'flowchart'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.navFlowchart}
          </a>
          <a
            href="#matrix"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('matrix');
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.navMatrix}
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher: Vietnamese <-> Traditional Chinese (UI only) */}
          <button
            type="button"
            data-testid="language-toggle-btn"
            onClick={() => setLang((prev) => (prev === 'vi' ? 'zh-TW' : 'vi'))}
            title={
              lang === 'vi'
                ? 'Chuyển giao diện sang Tiếng Trung Phồn thể (繁體中文)'
                : '切換介面語言至越南文 (Tiếng Việt)'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.langSwitchLabel}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            data-testid="theme-toggle-btn"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-label={isDarkMode ? t.themeLight : t.themeDark}
            title={isDarkMode ? t.themeLight : t.themeDark}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t.themeLight}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{t.themeDark}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.createNewWorkflowBtn}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row">
        {/* Compact Left Sidebar */}
        <aside
          aria-label={t.sidebarAria}
          className={`border-b lg:border-b-0 lg:border-r border-slate-200 bg-white transition-all duration-200 shrink-0 ${
            isSidebarCollapsed
              ? 'w-full lg:w-12 p-2 flex flex-row lg:flex-col items-center justify-between gap-2'
              : 'w-full lg:w-64 p-3.5 space-y-3.5 flex flex-col justify-between'
          }`}
        >
          {isSidebarCollapsed ? (
            <>
              <div className="flex lg:flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  aria-label={t.expandSidebar}
                  title={t.expandSidebar}
                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <span
                  title={t.workflowDirectoryTitle(workflows.length)}
                  className="text-[11px] font-mono tabular-nums font-bold text-slate-700 px-1.5 py-0.5 rounded bg-slate-100"
                >
                  {workflows.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  aria-label={t.createNewWorkflowBtn}
                  title={t.createNewWorkflowBtn}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs text-slate-500 lg:hidden">
                {t.collapsedSidebarSummary(workflows.length)}
              </span>

              {workflows.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                    setConfirmClearAll(true);
                  }}
                  aria-label={t.deleteAllWorkflowsBtn}
                  title={t.deleteAllWorkflowsBtn}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                      <FolderKanban className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{t.workflowDirectoryTitle(workflows.length)}</span>
                    </h2>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 whitespace-nowrap cursor-pointer"
                      >
                        {t.createNewShort}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(true)}
                        aria-label={t.collapseSidebar}
                        title={t.collapseSidebar}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <PanelLeftClose className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <label htmlFor="workflow-search" className="sr-only">
                      {t.searchPlaceholder}
                    </label>
                    <input
                      id="workflow-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5" role="list">
                  {filteredWorkflows.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                      <p>
                        {workflows.length === 0
                          ? t.emptyWorkflowList
                          : t.noMatchingWorkflow}
                      </p>
                    </div>
                  ) : (
                    filteredWorkflows.map((wf) => {
                      const isSelected = currentWorkflow?.id === wf.id;
                      const wfProgress = calculateWorkflowProgress(wf);

                      return (
                        <button
                          key={wf.id}
                          type="button"
                          onClick={() => handleSelectWorkflow(wf.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/50 border-emerald-600 ring-1 ring-emerald-600/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                            <span className="truncate">{wf.category}</span>
                            <span className="font-mono tabular-nums shrink-0 text-emerald-700 font-semibold">
                              {t.stepsCountUnit(wfProgress.totalStepsCount)}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900 mt-0.5 leading-snug line-clamp-2">
                            {wf.title}
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                            <span>
                              {t.subtasksCountUnit(wfProgress.totalSubtasksCount)}
                            </span>
                            <span>
                              {t.branchesCountUnit(wfProgress.totalBranchesCount)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Delete All Workflows Action Zone */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                {workflows.length > 0 ? (
                  !confirmClearAll ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.deleteAllWorkflowsBtn}</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-red-900">
                        {t.confirmDeleteAllText(workflows.length)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDeleteAllWorkflows}
                          className="flex-1 px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
                        >
                          {t.confirmDeleteAllBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                        >
                          {t.cancelBtn}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleRestoreSampleWorkflows}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.restoreSampleWorkflowsBtn}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Main Content Area (Compact Padding & Streamlined Header) */}
        <main className="flex-1 min-w-0 p-4 space-y-4">
          {!currentWorkflow || !selectedStep ? (
            /* Empty State when user deleted all workflows */
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl mx-auto space-y-5">
              <div className="space-y-1.5 text-center">
                <h1 className="text-lg font-bold text-slate-900">
                  {t.emptyStateTitle}
                </h1>
                <p className="text-xs text-slate-600">
                  {t.emptyStateDesc}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickStepsText.trim()) return;
                  handleGenerateFromStepsText({
                    title: quickTitle,
                    category: 'Quy trình Tự định nghĩa',
                    rawStepsText: quickStepsText,
                  });
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <div>
                  <label
                    htmlFor="empty-quick-title"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    {t.newWorkflowNameLabel}
                  </label>
                  <input
                    id="empty-quick-title"
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="empty-quick-steps"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    {t.listStepsAndBranchesLabel}
                  </label>
                  <textarea
                    id="empty-quick-steps"
                    rows={7}
                    value={quickStepsText}
                    onChange={(e) => setQuickStepsText(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRestoreSampleWorkflows}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.restore3SampleWorkflowsBtn}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.openDetailedFormBtn}</span>
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                    >
                      <ListTree className="w-4 h-4" />
                      <span>{t.generateAndDrawNowBtn}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Compact Single-Row Workflow Header & Inline Metrics Strip */}
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-700">
                      {currentWorkflow.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {t.stepsCountUnit(progress.totalStepsCount)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {t.subtasksCountUnit(progress.totalSubtasksCount)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {t.branchesCountUnit(progress.totalBranchesCount)}
                    </span>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <GitBranch className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-xs">
                        {selectedStep.code}: {selectedStep.title}
                      </span>
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {currentWorkflow.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="open-export-json-modal-btn"
                    onClick={() => setIsExportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>{t.exportJsonBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCurrentWorkflow}
                    aria-label={t.deleteThisWorkflowBtn}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.deleteThisWorkflowBtn}</span>
                  </button>
                </div>
              </div>

              {/* Active Workspace View */}
              {activeTab === 'execution' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  {/* Left 5 columns: Active Situational Step Chain */}
                  <div className="xl:col-span-5 min-w-0 bg-white border border-slate-200 rounded-xl p-4">
                    <ActivePathTimeline
                      activePath={activePath}
                      allSteps={currentWorkflow.steps}
                      selectedStepId={selectedStep.id}
                      onSelectStep={handleSelectStep}
                      onSelectBranch={handleSelectBranch}
                      onOpenAddStepModal={() => setIsAddStepModalOpen(true)}
                      lang={lang}
                    />
                  </div>

                  {/* Right 7 columns: Selected Step Sub-steps & Situational Branching Flow Builder */}
                  <div className="xl:col-span-7 min-w-0">
                    <StepExecutionPanel
                      workflow={currentWorkflow}
                      step={selectedStep}
                      onAddSubtask={handleAddSubtask}
                      onRemoveSubtask={handleRemoveSubtask}
                      onSelectBranch={handleSelectBranch}
                      onUpdateBranchTarget={handleUpdateBranchTarget}
                      onAddBranch={handleAddBranch}
                      onRemoveBranch={handleRemoveBranch}
                      onUpdateStepDetails={handleUpdateStepDetails}
                      onDeleteStep={handleDeleteStep}
                      onJumpToStep={handleSelectStep}
                      onOpenAddStepModal={() => setIsAddStepModalOpen(true)}
                      statusBanner={statusBanner}
                      lang={lang}
                    />
                  </div>
                </div>
              ) : activeTab === 'flowchart' ? (
                <ProcessFlowchartView
                  workflow={currentWorkflow}
                  selectedStepId={selectedStep.id}
                  onSelectStep={handleSelectStep}
                  onSelectBranch={handleSelectBranch}
                  onGenerateFromText={handleGenerateFromStepsText}
                  onOpenAddStepModal={() => setIsAddStepModalOpen(true)}
                  lang={lang}
                />
              ) : (
                <DecisionMatrixView
                  workflow={currentWorkflow}
                  activeStepIds={activeStepIdsSet}
                  selectedStepId={selectedStep.id}
                  onSelectStep={handleSelectStep}
                  onSelectBranch={handleSelectBranch}
                  lang={lang}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals for Creating a New Workflow or Adding a New Step */}
      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateWorkflow={handleCreateWorkflow}
        lang={lang}
      />

      {currentWorkflow && (
        <AddStepModal
          isOpen={isAddStepModalOpen}
          onClose={() => setIsAddStepModalOpen(false)}
          existingSteps={Object.values(currentWorkflow.steps)}
          defaultParentStepId={selectedStep?.id || currentWorkflow.rootStepId}
          onAddStep={handleAddStep}
          lang={lang}
        />
      )}

      {currentWorkflow && (
        <ExportWorkflowModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          workflow={currentWorkflow}
          onImportWorkflow={handleImportWorkflow}
          lang={lang}
        />
      )}
    </div>
  );
}
