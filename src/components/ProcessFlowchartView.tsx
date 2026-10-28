import React, { useMemo, useState, useEffect } from 'react';
import { Workflow } from '../utils/workflowTypes';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import {
  computeFlowchartLayout,
} from '../utils/workflowEngine';
import {
  GitBranch,
  CheckCircle2,
  Sparkles,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ListTree,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react';

interface ProcessFlowchartViewProps {
  workflow: Workflow;
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
  onSelectBranch: (stepId: string, branchId: string, advanceFocus?: boolean) => void;
  onGenerateFromText: (payload: {
    title: string;
    category: string;
    rawStepsText: string;
  }) => void;
  onOpenAddStepModal: () => void;
  lang?: AppLanguage;
}

const SAMPLE_OUTLINE = `Bước 1: Tiếp nhận & Phân loại Yêu cầu Bảo hành
- Kiểm tra số Serial và thời hạn bảo hành trên hệ thống
- Chụp ảnh hiện trạng thiết bị khi bàn giao
-> Lỗi phần mềm nhẹ: Cập nhật Firmware & Bàn giao ngay
-> Hỏng linh kiện phần cứng: Chuyển Xưởng Kỹ thuật Thay thế

Bước 2: Cập nhật Firmware & Bàn giao ngay
- Chạy công cụ chuẩn đoán tự động
- Khởi động lại và kiểm tra nghiệm thu cùng khách hàng

Bước 3: Chuyển Xưởng Kỹ thuật Thay thế
- Lập phiếu xuất kho linh kiện chính hãng
- Kiểm tra an toàn điện và đóng gói trả khách`;

export const ProcessFlowchartView: React.FC<ProcessFlowchartViewProps> = ({
  workflow,
  selectedStepId,
  onSelectStep,
  onSelectBranch,
  onGenerateFromText,
  onOpenAddStepModal,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [zoom, setZoom] = useState(1);
  const [showTextBuilder, setShowTextBuilder] = useState(false);
  const [builderTitle, setBuilderTitle] = useState(
    'Quy trình Bảo hành & Xử lý Kỹ thuật'
  );
  const [builderCategory, setBuilderCategory] = useState('Dịch vụ Kỹ thuật');
  const [rawStepsText, setRawStepsText] = useState(SAMPLE_OUTLINE);
  const [builderError, setBuilderError] = useState('');

  // Track which step box or situation box is clicked/expanded on the diagram
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [expandedBranchInfo, setExpandedBranchInfo] = useState<{
    fromStepId: string;
    branchId: string;
  } | null>(null);
  const [activeInspectorMode, setActiveInspectorMode] = useState<'step' | 'branch' | null>(null);

  const layout = useMemo(
    () =>
      computeFlowchartLayout(workflow, {
        expandedStepId,
        expandedBranchId: expandedBranchInfo?.branchId ?? null,
      }),
    [workflow, expandedStepId, expandedBranchInfo]
  );

  const inspectedStep = expandedStepId ? workflow.steps[expandedStepId] || null : null;

  const inspectedBranchData = useMemo(() => {
    if (!expandedBranchInfo) return null;
    const fromStep = workflow.steps[expandedBranchInfo.fromStepId];
    if (!fromStep) return null;
    const branch = fromStep.branches.find(
      (b) => b.id === expandedBranchInfo.branchId
    );
    if (!branch) return null;
    const targetStep = branch.targetStepId
      ? workflow.steps[branch.targetStepId] || null
      : null;
    return { fromStep, branch, targetStep };
  }, [workflow, expandedBranchInfo]);

  const handleCollapseAll = () => {
    setExpandedStepId(null);
    setExpandedBranchInfo(null);
    setActiveInspectorMode(null);
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-flowchart-keep-open="true"]')) {
        return;
      }
      setExpandedStepId(null);
      setExpandedBranchInfo(null);
      setActiveInspectorMode(null);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleClickStepNode = (stepId: string) => {
    onSelectStep(stepId);
    setExpandedStepId(stepId);
    setExpandedBranchInfo(null);
    setActiveInspectorMode('step');
  };

  const handleClickSituationNode = (fromStepId: string, branchId: string) => {
    onSelectBranch(fromStepId, branchId, false);
    setExpandedBranchInfo({ fromStepId, branchId });
    setExpandedStepId(null);
    setActiveInspectorMode('branch');
  };

  const handleDrawFromText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawStepsText.trim()) {
      setBuilderError('Vui lòng liệt kê ít nhất một bước công việc để vẽ sơ đồ.');
      return;
    }
    setBuilderError('');
    onGenerateFromText({
      title: builderTitle.trim() || 'Quy trình Tự động Vẽ từ Danh sách Bước',
      category: builderCategory.trim() || 'Sơ đồ Quy trình',
      rawStepsText,
    });
    setShowTextBuilder(false);
  };

  return (
    <div className="space-y-4" onClick={handleCollapseAll}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
        {/* Compact Single-Row Flowchart Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.flowchartTitle}</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t.flowchartSubtitle}
            </p>
          </div>

          <div
            data-flowchart-keep-open="true"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-2"
          >
            {/* Inline Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
                aria-label="Zoom out"
                className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono tabular-nums px-1.5 text-[11px] font-semibold text-slate-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
                aria-label="Zoom in"
                className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
                className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTextBuilder((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>
                {showTextBuilder
                  ? t.closeStepListInputBtn
                  : t.openStepListInputBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAddStepModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addStepToDiagramBtn}</span>
            </button>
          </div>
        </div>

        {/* Interactive Text-to-Flowchart Builder Panel */}
        {showTextBuilder && (
          <form
            data-flowchart-keep-open="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleDrawFromText}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {t.quickBuilderHeading}
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {t.quickBuilderDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRawStepsText(SAMPLE_OUTLINE)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                {t.fillSampleBranchBtn}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2">
                <label
                  htmlFor="flowchart-builder-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.diagramWorkflowTitleLabel}
                </label>
                <input
                  id="flowchart-builder-title"
                  type="text"
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label
                  htmlFor="flowchart-builder-cat"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.departmentGroupLabel}
                </label>
                <input
                  id="flowchart-builder-cat"
                  type="text"
                  value={builderCategory}
                  onChange={(e) => setBuilderCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="flowchart-steps-textarea"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t.listStepsAndBranchesLabel}
              </label>
              <textarea
                id="flowchart-steps-textarea"
                rows={6}
                value={rawStepsText}
                onChange={(e) => setRawStepsText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {builderError && (
              <p className="text-xs text-red-600 font-medium">{builderError}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTextBuilder(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.createAndDrawDiagramBtn}</span>
              </button>
            </div>
          </form>
        )}

        {/* Synchronized Detail Inspector Card (Only visible when a box is clicked) */}
        {((activeInspectorMode === 'branch' && inspectedBranchData) ||
          inspectedStep) && (
          <div
            data-testid="flowchart-selection-detail"
            data-flowchart-keep-open="true"
            onClick={(e) => e.stopPropagation()}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
          >
            {activeInspectorMode === 'branch' && inspectedBranchData ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <GitBranch className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {t.selectedSituationDetailHeader(inspectedBranchData.fromStep.code)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleClickStepNode(inspectedBranchData.fromStep.id)
                      }
                      className="text-xs font-medium text-slate-600 hover:text-emerald-700 cursor-pointer"
                    >
                      {t.viewSubtasksOfStepLink(inspectedBranchData.fromStep.code)}
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {t.collapseAllBtn}
                    </button>
                  </div>
                </div>

                <div className="text-sm font-bold text-slate-900 break-words">
                  {inspectedBranchData.branch.label}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-0.5">
                      {t.whenOccursLabel}
                    </div>
                    <div className="text-slate-700 leading-relaxed break-words">
                      {inspectedBranchData.branch.conditionDescription}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-0.5">
                      {t.actionResolutionLabel}
                    </div>
                    <div className="text-slate-700 leading-relaxed break-words">
                      {inspectedBranchData.branch.actionGuidance}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 mb-0.5">
                        {t.processNavigationLabel}
                      </div>
                      <div className="text-emerald-700 font-semibold break-words">
                        {inspectedBranchData.targetStep
                          ? t.fromToStepText(
                              inspectedBranchData.fromStep.code,
                              inspectedBranchData.targetStep.code,
                              inspectedBranchData.targetStep.title
                            )
                          : t.fromToEndText(inspectedBranchData.fromStep.code)}
                      </div>
                    </div>
                    {inspectedBranchData.targetStep && (
                      <button
                        type="button"
                        onClick={() =>
                          handleClickStepNode(inspectedBranchData.targetStep!.id)
                        }
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <span>
                          {t.viewAllSubtasksOfTargetBtn(
                            inspectedBranchData.targetStep.subtasks.length,
                            inspectedBranchData.targetStep.code
                          )}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              inspectedStep && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                        <span className="font-bold text-emerald-700">
                          {t.selectedStepDetailHeader(inspectedStep.code)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans inline-flex items-center gap-1 text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {t.ownerPrefix} {inspectedStep.ownerRole}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5 break-words">
                        {inspectedStep.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {t.fullSubtasksBadgeInStep(
                          inspectedStep.subtasks.length,
                          inspectedStep.code
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded border border-slate-200 bg-white cursor-pointer"
                      >
                        {t.collapseShortBtn}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {inspectedStep.subtasks.map((st, idx) => (
                      <div
                        key={st.id}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-xs space-y-0.5"
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="font-mono tabular-nums font-bold text-emerald-700 shrink-0">
                            {inspectedStep.code}.{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 break-words">
                            {st.title}
                          </span>
                        </div>
                        {st.note && (
                          <div className="pl-6 text-[11px] text-slate-500 break-words">
                            {t.guidancePrefix} {st.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Interactive Flowchart Canvas (SVG Planar Orthogonal Layer + Expandable HTML Node & Situation Cards) */}
        <div
          data-testid="workflow-flowchart-canvas"
          onClick={handleCollapseAll}
          className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/70 p-3"
        >
          <div
            style={{
              width: `${layout.canvasWidth}px`,
              height: `${layout.canvasHeight}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            className="relative mx-auto transition-all"
          >
            {/* Directed Edges SVG Layer (Emerald Active Path + Slate Standby Path) */}
            <svg
              width={layout.canvasWidth}
              height={layout.canvasHeight}
              className="absolute inset-0 pointer-events-none"
              aria-label={t.flowchartTitle}
            >
              <defs>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
                <marker
                  id="arrow-inactive"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
                </marker>
              </defs>

              {layout.edges.map((edge) => {
                const strokeColor = edge.isOnActivePath ? '#059669' : '#94A3B8';
                const strokeWidth = edge.isOnActivePath ? 2.5 : 1.75;

                return (
                  <g key={edge.id}>
                    <path
                      d={edge.pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={edge.isOnActivePath ? undefined : '6 5'}
                      markerEnd={
                        edge.isOnActivePath
                          ? 'url(#arrow-active)'
                          : 'url(#arrow-inactive)'
                      }
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Situation Boxes (Ô Tình Huống) on Flowchart */}
            {layout.edges.map((edge) => {
              const isExpandedSituation =
                expandedBranchInfo?.branchId === edge.branch.id &&
                activeInspectorMode === 'branch';
              const shortLabel =
                edge.branch.label.length > 34
                  ? `${edge.branch.label.slice(0, 32)}…`
                  : edge.branch.label;
              const targetStep = edge.toStepId
                ? workflow.steps[edge.toStepId]
                : null;

              return (
                <button
                  key={`label-${edge.id}`}
                  type="button"
                  data-testid={`flowchart-situation-box-${edge.branch.id}`}
                  data-flowchart-keep-open="true"
                  title={edge.branch.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickSituationNode(edge.fromStepId, edge.branch.id);
                  }}
                  style={{
                    left: `${edge.labelX}px`,
                    top: `${edge.labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    width: isExpandedSituation ? '324px' : undefined,
                  }}
                  className={`absolute rounded-xl border text-left transition-colors cursor-pointer ${
                    isExpandedSituation
                      ? 'z-30 p-3 bg-white border-emerald-600 ring-2 ring-emerald-600/20 shadow-md whitespace-normal'
                      : edge.isOnActivePath
                        ? 'z-10 px-2.5 py-1 bg-emerald-600 text-white border-emerald-700 text-[11px] font-medium shadow-xs whitespace-nowrap'
                        : 'z-10 px-2.5 py-1 bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[11px] font-medium shadow-xs whitespace-nowrap'
                  }`}
                >
                  {isExpandedSituation ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <span>{t.situationCardHeader}</span>
                        <span>{t.selectedBadge}</span>
                      </div>
                      <div className="font-bold text-slate-900 leading-snug break-words">
                        {edge.branch.label}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-snug break-words">
                        <span className="font-semibold text-slate-800">
                          {t.situationShortPrefix}
                        </span>
                        {edge.branch.conditionDescription}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-snug break-words">
                        <span className="font-semibold text-slate-800">
                          {t.resolutionShortPrefix}
                        </span>
                        {edge.branch.actionGuidance}
                      </div>
                      <div className="pt-1 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {targetStep
                            ? t.moveToStepOption(targetStep.code, targetStep.title)
                            : t.completeAndCloseNode}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span>{shortLabel}</span>
                  )}
                </button>
              );
            })}

            {/* Interactive Step Boxes (Ô Bước) on Flowchart */}
            {layout.nodes.map((node) => {
              const isExpanded = node.step.id === expandedStepId;

              return (
                <div
                  key={node.step.id}
                  data-testid={`flowchart-step-box-${node.step.id}`}
                  data-flowchart-keep-open="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickStepNode(node.step.id);
                  }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                  className={`absolute z-20 rounded-xl border p-3.5 flex flex-col justify-between transition-colors shadow-xs cursor-pointer ${
                    isExpanded
                      ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/20'
                      : node.isInActivePath
                        ? 'bg-white border-slate-300 hover:border-emerald-500'
                        : 'bg-slate-100/95 border-slate-300 hover:bg-white hover:border-emerald-500'
                  }`}
                >
                  <div className="space-y-2 overflow-y-auto pr-0.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
                        <span className="font-bold text-emerald-700">
                          {node.step.code}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <GitBranch className="w-3 h-3 text-emerald-500" />
                          {t.directionsUnit(node.step.branches.length)}
                        </span>
                      </div>

                      <div
                        className={`text-xs font-bold text-slate-900 mt-1 leading-snug ${
                          isExpanded ? 'break-words' : 'line-clamp-2'
                        }`}
                      >
                        {node.step.title}
                      </div>
                    </div>

                    {/* Full Sub-steps list rendered directly inside the clicked Step Box on the Flowchart */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <ListTree className="w-3 h-3 shrink-0" />
                          <span>
                            {t.subtasksInStepShort(
                              node.step.code,
                              node.step.subtasks.length
                            )}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {node.step.subtasks.map((st, idx) => (
                            <li
                              key={st.id}
                              className="text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200/80 leading-snug break-words"
                            >
                              <span className="font-mono tabular-nums font-bold text-emerald-700 mr-1">
                                {idx + 1}.
                              </span>
                              <span>{st.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] shrink-0">
                    <span className="font-mono tabular-nums text-slate-600 inline-flex items-center gap-1">
                      <ListTree className="w-3.5 h-3.5 text-emerald-600" />
                      {t.subtasksCountUnit(node.step.subtasks.length)}
                    </span>

                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5 whitespace-nowrap">
                      {isExpanded ? (
                        <>
                          <span>{t.showingFullNodeText}</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>{t.viewSubtasksCountNodeText(node.step.subtasks.length)}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Terminal Completion Node */}
            {layout.hasTerminalEdges && (
              <div
                style={{
                  left: `${layout.terminalX - 110}px`,
                  top: `${layout.terminalY}px`,
                  width: '220px',
                  height: '44px',
                }}
                className="absolute z-20 rounded-xl bg-emerald-700 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{t.completeAndCloseNode}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
