import React from 'react';
import { Workflow } from '../utils/workflowTypes';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import { GitBranch, ArrowRight, CornerDownRight, ListTree } from 'lucide-react';

interface DecisionMatrixViewProps {
  workflow: Workflow;
  activeStepIds: Set<string>;
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
  onSelectBranch: (stepId: string, branchId: string, advanceFocus?: boolean) => void;
  lang?: AppLanguage;
}

export const DecisionMatrixView: React.FC<DecisionMatrixViewProps> = ({
  workflow,
  activeStepIds,
  selectedStepId,
  onSelectStep,
  onSelectBranch,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const allSteps = Object.values(workflow.steps);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {t.matrixTitle}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t.matrixSubtitle}
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-600">
          {t.totalStepsInWorkflowText(allSteps.length)}
        </div>
      </div>

      <div className="space-y-3">
        {allSteps.map((step) => {
          const isInActivePath = activeStepIds.has(step.id);
          const isFocused = step.id === selectedStepId;

          return (
            <div
              key={step.id}
              className={`p-4 rounded-xl border transition-all ${
                isInActivePath
                  ? 'bg-white border-slate-300'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span className="font-bold text-emerald-700">{step.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {isInActivePath ? t.inActiveFlowText : t.otherSituationBranchBadge}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.matrixStepStats(step.subtasks.length, step.branches.length)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isFocused
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {isFocused ? t.editingDesignBtn : t.editStepAndBranchesBtn}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3">
                {/* Sub-steps column */}
                <div className="lg:col-span-5 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <ListTree className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.innerSubtasksHeading(step.subtasks.length)}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {step.subtasks.map((st, idx) => (
                      <li
                        key={st.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5"
                      >
                        <div className="flex items-start gap-1.5">
                          <CornerDownRight className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500" />
                          <span className="font-semibold text-slate-900 break-words">
                            <span className="font-mono tabular-nums font-bold text-emerald-700 mr-1">
                              {step.code}.{idx + 1}
                            </span>
                            {st.title}
                          </span>
                        </div>
                        {st.note && (
                          <div className="pl-4 text-[11px] text-slate-600 break-words">
                            {t.guidancePrefix} {st.note}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Branches column */}
                <div className="lg:col-span-7 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.situationDirectionsHeading(step.branches.length)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {step.branches.map((br) => {
                      const isSelectedBranch =
                        (step.selectedBranchId || step.branches[0]?.id) === br.id;
                      const dest = br.targetStepId ? workflow.steps[br.targetStepId] : null;
                      return (
                        <button
                          key={br.id}
                          type="button"
                          onClick={() => onSelectBranch(step.id, br.id, false)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer space-y-1 ${
                            isSelectedBranch
                              ? 'bg-emerald-50/60 border-emerald-600 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                            <span className="break-words">{br.label}</span>
                            {isSelectedBranch && (
                              <span className="text-emerald-700 shrink-0">{t.selectedOnFlowBadge}</span>
                            )}
                          </div>
                          <div className="text-slate-600 break-words">
                            <span className="font-semibold text-slate-800">{t.specificSituationLabel}</span>{' '}
                            {br.conditionDescription}
                          </div>
                          <div className="text-slate-600 break-words">
                            <span className="font-semibold text-slate-800">{t.handlingDirectionLabel}</span>{' '}
                            {br.actionGuidance}
                          </div>
                          <div className="pt-0.5 inline-flex items-center gap-1 font-medium text-emerald-700">
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>
                              {dest
                                ? t.transitionToStep(dest.code, dest.title)
                                : t.endWorkflowShort}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
