import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowStep } from '../utils/workflowTypes';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import {
  Plus,
  Trash2,
  GitBranch,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  CornerDownRight,
  Pencil,
  ListTree,
} from 'lucide-react';

interface StepExecutionPanelProps {
  workflow: Workflow;
  step: WorkflowStep;
  onAddSubtask: (stepId: string, title: string, required: boolean, note?: string) => void;
  onRemoveSubtask: (stepId: string, subtaskId: string) => void;
  onSelectBranch: (stepId: string, branchId: string, advanceFocus?: boolean) => void;
  onUpdateBranchTarget: (stepId: string, branchId: string, targetStepId: string | null) => void;
  onAddBranch: (
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
  ) => void;
  onRemoveBranch: (stepId: string, branchId: string) => void;
  onUpdateStepDetails: (
    stepId: string,
    updates: { title?: string; description?: string; ownerRole?: string; code?: string }
  ) => void;
  onDeleteStep: (stepId: string) => void;
  onJumpToStep: (stepId: string) => void;
  onOpenAddStepModal: () => void;
  statusBanner: { type: 'error' | 'success'; message: string } | null;
  lang?: AppLanguage;
}

export const StepExecutionPanel: React.FC<StepExecutionPanelProps> = ({
  workflow,
  step,
  onAddSubtask,
  onRemoveSubtask,
  onSelectBranch,
  onUpdateBranchTarget,
  onAddBranch,
  onRemoveBranch,
  onUpdateStepDetails,
  onDeleteStep,
  onJumpToStep,
  onOpenAddStepModal,
  statusBanner,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];

  // Inline step metadata editor state
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [editOwner, setEditOwner] = useState(step.ownerRole);
  const [editDesc, setEditDesc] = useState(step.description);

  useEffect(() => {
    setIsEditingStep(false);
    setEditTitle(step.title);
    setEditOwner(step.ownerRole);
    setEditDesc(step.description);
  }, [step.id, step.title, step.ownerRole, step.description]);

  // Sub-step builder form state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskNote, setNewSubtaskNote] = useState('');
  const [subtaskError, setSubtaskError] = useState('');

  // Branch builder form state
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchLabel, setBranchLabel] = useState('');
  const [branchCondition, setBranchCondition] = useState('');
  const [branchGuidance, setBranchGuidance] = useState('');
  const [targetMode, setTargetMode] = useState<'new' | 'existing' | 'end'>('new');
  const [existingTargetId, setExistingTargetId] = useState<string>('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepRole, setNewStepRole] = useState('');
  const [newStepSubtasksText, setNewStepSubtasksText] = useState('');
  const [branchFormError, setBranchFormError] = useState('');

  const totalStepsInWorkflow = Object.keys(workflow.steps).length;
  const otherSteps = Object.values(workflow.steps).filter((s) => s.id !== step.id);

  const selectedBranch =
    step.branches.find((b) => b.id === step.selectedBranchId) ||
    step.branches[0] ||
    null;

  const targetStep =
    selectedBranch && selectedBranch.targetStepId
      ? workflow.steps[selectedBranch.targetStepId]
      : null;

  const handleSaveStepMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onUpdateStepDetails(step.id, {
      title: editTitle.trim(),
      ownerRole: editOwner.trim() || step.ownerRole,
      description: editDesc.trim(),
    });
    setIsEditingStep(false);
  };

  const handleSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) {
      setSubtaskError(t.subtaskEmptyError);
      return;
    }
    setSubtaskError('');
    onAddSubtask(step.id, newSubtaskTitle, true, newSubtaskNote);
    setNewSubtaskTitle('');
    setNewSubtaskNote('');
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchLabel.trim()) {
      setBranchFormError('Vui lòng nhập tên tình huống hoặc điều kiện rẽ nhánh.');
      return;
    }
    if (targetMode === 'new' && !newStepTitle.trim()) {
      setBranchFormError('Vui lòng nhập tên bước tiếp theo sẽ chuyển tới trong tình huống này.');
      return;
    }
    if (targetMode === 'existing' && !existingTargetId) {
      setBranchFormError('Vui lòng chọn bước đích có sẵn trong quy trình.');
      return;
    }

    setBranchFormError('');
    const parsedSubtasks = newStepSubtasksText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    onAddBranch(step.id, {
      label: branchLabel,
      conditionDescription: branchCondition,
      actionGuidance: branchGuidance,
      targetMode,
      existingTargetStepId: existingTargetId || undefined,
      newStepTitle,
      newStepRole: newStepRole || step.ownerRole,
      newStepSubtasks: parsedSubtasks,
    });

    setBranchLabel('');
    setBranchCondition('');
    setBranchGuidance('');
    setNewStepTitle('');
    setNewStepRole('');
    setNewStepSubtasksText('');
    setShowBranchForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-5">
      {/* Compact Step Header & Inline Builder Metadata */}
      <div className="border-b border-slate-200 pb-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <span className="font-bold text-emerald-700">{step.code}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-sans">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              {t.ownerPrefix} {step.ownerRole}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditingStep((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>{isEditingStep ? t.closeEditBtn : t.editStepInfoBtn}</span>
            </button>

            {totalStepsInWorkflow > 1 && (
              <button
                type="button"
                onClick={() => onDeleteStep(step.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.deleteThisStepBtn}</span>
              </button>
            )}
          </div>
        </div>

        {isEditingStep ? (
          <form
            onSubmit={handleSaveStepMetadata}
            className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2">
                <label
                  htmlFor="edit-step-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.stepTitleLabel}
                </label>
                <input
                  id="edit-step-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-step-owner"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.ownerRoleLabel}
                </label>
                <input
                  id="edit-step-owner"
                  type="text"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="edit-step-desc"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t.stepDescLabel}
              </label>
              <input
                id="edit-step-desc"
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingStep(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer"
              >
                {t.saveStepInfoBtn}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {step.title}
            </h2>
            {step.description && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {step.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Feedback Banner */}
      {statusBanner && (
        <div
          role="alert"
          className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
            statusBanner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusBanner.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* SECTION 1: SUB-STEPS STRUCTURE */}
      <section aria-labelledby="subtasks-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="subtasks-heading" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ListTree className="w-4 h-4 text-emerald-600" />
            <span>{t.section1Title(step.code)}</span>
          </h3>

          <span className="text-xs font-mono tabular-nums text-slate-500">
            {t.totalSubtasksCount(step.subtasks.length)}
          </span>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
          {step.subtasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {t.emptySubtasksPrompt}
            </div>
          ) : (
            step.subtasks.map((st, idx) => (
              <div
                key={st.id}
                className="px-3 py-2.5 flex items-start justify-between gap-2.5 bg-white hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-medium text-slate-900 leading-snug">
                      <span className="font-mono tabular-nums font-bold text-emerald-700 mr-1.5">
                        {step.code}.{idx + 1}
                      </span>
                      {st.title}
                    </div>
                    {st.note && (
                      <div className="text-[11px] text-slate-500">
                        {t.guidanceCriteriaPrefix} {st.note}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveSubtask(step.id, st.id)}
                  aria-label={`Remove ${st.title}`}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Compact Inline Add Sub-step Form */}
        <form onSubmit={handleSubtaskSubmit} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="subtask-title-input" className="sr-only">
                {t.subtaskTitlePlaceholder}
              </label>
              <input
                id="subtask-title-input"
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={t.subtaskTitlePlaceholder}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="sm:w-48 shrink-0">
              <label htmlFor="subtask-note-input" className="sr-only">
                {t.subtaskNotePlaceholder}
              </label>
              <input
                id="subtask-note-input"
                type="text"
                value={newSubtaskNote}
                onChange={(e) => setNewSubtaskNote(e.target.value)}
                placeholder={t.subtaskNotePlaceholder}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addSubtaskBtn}</span>
            </button>
          </div>
          {subtaskError && (
            <p className="text-xs text-red-600 font-medium">{subtaskError}</p>
          )}
        </form>
      </section>

      {/* SECTION 2: SITUATIONAL RESOLUTION & BRANCHING FLOW BUILDER */}
      <section aria-labelledby="branching-heading" className="space-y-3 pt-3.5 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="branching-heading" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-emerald-600" />
            <span>{t.section2Title}</span>
          </h3>

          <button
            type="button"
            onClick={() => setShowBranchForm((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showBranchForm ? t.closeAddBranchBtn : t.addNewBranchBtn}</span>
          </button>
        </div>

        {/* Compact Situational Branch Cards */}
        <div className="space-y-2.5" role="radiogroup" aria-label={t.section2Title}>
          {step.branches.map((branch) => {
            const isSelected = selectedBranch?.id === branch.id;
            const destStep = branch.targetStepId ? workflow.steps[branch.targetStepId] : null;

            return (
              <div
                key={branch.id}
                className={`p-3 rounded-xl border transition-all space-y-2 ${
                  isSelected
                    ? 'bg-emerald-50/40 border-emerald-600 ring-1 ring-emerald-600/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectBranch(step.id, branch.id, false)}
                    className="text-left flex-1 space-y-1 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected ? 'text-emerald-950' : 'text-slate-900'
                        }`}
                      >
                        {branch.label}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {t.viewingThisFlowBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{t.applicableConditionLabel}</span>{' '}
                      {branch.conditionDescription}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{t.resolutionGuidanceLabel}</span>{' '}
                      {branch.actionGuidance}
                    </p>
                  </button>

                  {step.branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveBranch(step.id, branch.id)}
                      aria-label={`Remove ${branch.label}`}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Flow Connector Control */}
                <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className="font-medium text-slate-700 inline-flex items-center gap-1 shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.branchTargetLabel}</span>
                    </span>
                    <label htmlFor={`branch-target-${branch.id}`} className="sr-only">
                      {t.branchTargetLabel}
                    </label>
                    <select
                      id={`branch-target-${branch.id}`}
                      value={branch.targetStepId || '__END__'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateBranchTarget(
                          step.id,
                          branch.id,
                          val === '__END__' ? null : val
                        );
                      }}
                      className="w-full sm:w-auto max-w-full min-w-0 truncate px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="__END__">{t.endWorkflowAfterStepOption}</option>
                      {otherSteps.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t.moveToStepOption(s.code, s.title)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {destStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBranch(step.id, branch.id, false);
                        onJumpToStep(destStep.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{t.openStepBtn(destStep.code)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form to Add a New Situational Branch */}
        {showBranchForm && (
          <form
            onSubmit={handleBranchSubmit}
            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">
                {t.defineNewBranchHeading(step.code)}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="branch-label-input" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branchNameLabel}
                </label>
                <input
                  id="branch-label-input"
                  type="text"
                  value={branchLabel}
                  onChange={(e) => setBranchLabel(e.target.value)}
                  placeholder={t.branchNamePlaceholder}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="branch-cond-input" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branchConditionLabel}
                </label>
                <input
                  id="branch-cond-input"
                  type="text"
                  value={branchCondition}
                  onChange={(e) => setBranchCondition(e.target.value)}
                  placeholder={t.branchConditionPlaceholder}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="branch-guidance-input" className="block text-xs font-medium text-slate-700 mb-1">
                {t.branchGuidanceInputLabel}
              </label>
              <input
                id="branch-guidance-input"
                type="text"
                value={branchGuidance}
                onChange={(e) => setBranchGuidance(e.target.value)}
                placeholder={t.branchGuidancePlaceholder}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Destination choice */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">
                {t.nextStepChoiceLabel}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetMode('new')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    targetMode === 'new'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {t.targetModeNewBtn}
                </button>
                {otherSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMode('existing');
                      if (!existingTargetId && otherSteps[0]) {
                        setExistingTargetId(otherSteps[0].id);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      targetMode === 'existing'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {t.targetModeExistingBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTargetMode('end')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    targetMode === 'end'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {t.targetModeEndBtn}
                </button>
              </div>
            </div>

            {targetMode === 'new' && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="new-target-step-title" className="block text-xs font-medium text-slate-700 mb-1">
                      {t.newTargetStepNameLabel}
                    </label>
                    <input
                      id="new-target-step-title"
                      type="text"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-target-step-role" className="block text-xs font-medium text-slate-700 mb-1">
                      {t.newTargetStepRoleLabel}
                    </label>
                    <input
                      id="new-target-step-role"
                      type="text"
                      value={newStepRole}
                      onChange={(e) => setNewStepRole(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="new-target-step-subtasks" className="block text-xs font-medium text-slate-700 mb-1">
                    {t.newTargetStepSubtasksLabel}
                  </label>
                  <textarea
                    id="new-target-step-subtasks"
                    rows={2}
                    value={newStepSubtasksText}
                    onChange={(e) => setNewStepSubtasksText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            {targetMode === 'existing' && (
              <div>
                <label htmlFor="existing-step-select" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.selectExistingStepLabel}
                </label>
                <select
                  id="existing-step-select"
                  value={existingTargetId}
                  onChange={(e) => setExistingTargetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {otherSteps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {branchFormError && (
              <p className="text-xs text-red-600 font-medium">{branchFormError}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBranchForm(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                {t.saveBranchBtn}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* SECTION 3: COMPACT DIRECT FLOW NAVIGATION BAR */}
      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {targetStep ? (
            <span>
              {t.nextStepInSelectedBranch}{' '}
              <strong className="text-slate-900">
                {targetStep.code} — {targetStep.title}
              </strong>
            </span>
          ) : (
            <span className="font-medium text-slate-800">
              {t.selectedBranchEndsWorkflow}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddStepModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addNewStepToWorkflowBtn}</span>
          </button>

          {targetStep && (
            <button
              type="button"
              onClick={() => onJumpToStep(targetStep.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.designNextStepBtn(targetStep.code)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
