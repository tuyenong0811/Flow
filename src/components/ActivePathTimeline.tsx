import React, { useState } from 'react';
import { ActivePathNode, BranchOption, WorkflowStep } from '../utils/workflowTypes';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import {
  GitBranch,
  ArrowDown,
  Plus,
  ListTree,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

interface ActivePathTimelineProps {
  activePath: ActivePathNode[];
  allSteps: Record<string, WorkflowStep>;
  selectedStepId: string;
  onSelectStep: (stepId: string) => void;
  onSelectBranch?: (stepId: string, branchId: string, advanceFocus?: boolean) => void;
  onOpenAddStepModal: () => void;
  lang?: AppLanguage;
}

export const ActivePathTimeline: React.FC<ActivePathTimelineProps> = ({
  activePath,
  allSteps,
  selectedStepId,
  onSelectStep,
  onSelectBranch,
  onOpenAddStepModal,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [expandedStepId, setExpandedStepId] = useState<string | null>(selectedStepId);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);

  const activeStepIds = new Set(activePath.map((n) => n.step.id));
  const inactiveSteps = Object.values(allSteps).filter((s) => !activeStepIds.has(s.id));

  const handleClickStepBox = (stepId: string) => {
    onSelectStep(stepId);
    setExpandedStepId((prev) => (prev === stepId ? null : stepId));
  };

  const handleClickSituationBox = (
    stepId: string,
    branch: BranchOption,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (onSelectBranch) {
      onSelectBranch(stepId, branch.id, false);
    }
    setExpandedBranchId((prev) => (prev === branch.id ? null : branch.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {t.timelineTitle}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t.timelineSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddStepModal}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addNewStepTitleBtn}</span>
        </button>
      </div>

      {/* Active Path Chain */}
      <div className="space-y-2.5" role="list" aria-label={t.timelineTitle}>
        {activePath.map((node, index) => {
          const isSelected = node.step.id === selectedStepId;
          const showAllSubtasks = expandedStepId === node.step.id;
          const activeBranch =
            node.step.branches.find((b) => b.id === node.step.selectedBranchId) ||
            node.step.branches[0] ||
            null;
          const parentStep =
            index > 0 ? activePath[index - 1]?.step || null : null;

          return (
            <div key={node.step.id} role="listitem" className="space-y-2">
              {/* Clickable Incoming Situation Box if depth > 0 */}
              {node.incomingBranch && (
                <div className="pl-2">
                  <button
                    type="button"
                    onClick={(e) =>
                      handleClickSituationBox(
                        parentStep?.id || node.step.id,
                        node.incomingBranch!,
                        e
                      )
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                      expandedBranchId === node.incomingBranch.id
                        ? 'bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600/20'
                        : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate">
                          {node.incomingBranch.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-700 shrink-0 inline-flex items-center gap-0.5">
                        {expandedBranchId === node.incomingBranch.id ? (
                          <>
                            <span>{t.openingBadge}</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>{t.detailBadge}</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </span>
                    </div>

                    {/* Full details of incoming situation when clicked */}
                    {expandedBranchId === node.incomingBranch.id && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/80 space-y-1 text-xs text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-900">
                            {t.specificSituationLabel}{' '}
                          </span>
                          <span className="break-words">
                            {node.incomingBranch.conditionDescription}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">
                            {t.resolutionGuidanceLabel}{' '}
                          </span>
                          <span className="break-words">
                            {node.incomingBranch.actionGuidance}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1 font-semibold text-emerald-700 pt-0.5">
                          <ArrowRight className="w-3 h-3 shrink-0" />
                          <span>
                            {t.leadsToStep(node.step.code, node.step.title)}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* Compact Step Box (Ô Bước) */}
              <div
                data-testid={`timeline-step-box-${node.step.id}`}
                onClick={() => handleClickStepBox(node.step.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/15 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                      <span className="font-bold text-emerald-700 whitespace-nowrap shrink-0">
                        {node.step.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap shrink-0">
                        {t.stepOrderLabel(index + 1, activePath.length)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans text-slate-600 truncate">
                        {node.step.ownerRole}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                      {node.step.title}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                      showAllSubtasks
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>
                      {showAllSubtasks
                        ? t.showingFullBadge
                        : t.subtasksCountUnit(node.step.subtasks.length)}
                    </span>
                    {showAllSubtasks ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </div>

                {/* Sub-steps inside this Step Box: Show FULL list when clicked */}
                {showAllSubtasks && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-800 inline-flex items-center gap-1">
                      <ListTree className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {t.fullSubtasksListInStep(
                          node.step.code,
                          node.step.subtasks.length
                        )}
                      </span>
                    </div>

                    {node.step.subtasks.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-1">
                        {t.noSubtasksYet}
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {node.step.subtasks.map((st, stIdx) => (
                          <li
                            key={st.id}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-0.5"
                          >
                            <div className="flex items-start gap-1.5">
                              <span className="font-mono tabular-nums font-bold text-emerald-700 shrink-0">
                                {node.step.code}.{stIdx + 1}
                              </span>
                              <span className="font-semibold text-slate-900 break-words">
                                {st.title}
                              </span>
                            </div>
                            {st.note && (
                              <div className="pl-5 text-[11px] text-slate-600 break-words">
                                {t.guidanceCriteriaPrefix} {st.note}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Compact Clickable Situation Boxes (Các Ô Tình Huống tại bước này) */}
                {node.step.branches.length > 0 && (
                  <div
                    className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        {t.situationBoxesAtStep(
                          node.step.code,
                          node.step.branches.length
                        )}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {node.step.branches.map((br) => {
                        const isBranchActive = activeBranch?.id === br.id;
                        const isBranchExpanded = expandedBranchId === br.id;
                        const targetStep = br.targetStepId
                          ? allSteps[br.targetStepId]
                          : null;

                        return (
                          <button
                            key={br.id}
                            type="button"
                            data-testid={`timeline-situation-box-${br.id}`}
                            onClick={(e) =>
                              handleClickSituationBox(node.step.id, br, e)
                            }
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                              isBranchActive
                                ? 'bg-emerald-50/80 border-emerald-600 text-slate-900'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white hover:border-emerald-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900 break-words">
                                {br.label}
                              </span>
                              <span
                                className={`text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                                  isBranchActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200/70 text-slate-600'
                                }`}
                              >
                                <span>
                                  {isBranchActive ? t.selectedBadge : t.detailBadge}
                                </span>
                                {isBranchExpanded ? (
                                  <ChevronUp className="w-2.5 h-2.5" />
                                ) : (
                                  <ChevronDown className="w-2.5 h-2.5" />
                                )}
                              </span>
                            </div>

                            {isBranchExpanded && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 space-y-1 text-[11px] text-slate-700">
                                <div>
                                  <span className="font-semibold text-slate-900">
                                    {t.whatIsSituationLabel}{' '}
                                  </span>
                                  <span className="break-words">
                                    {br.conditionDescription}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900">
                                    {t.howToResolveLabel}{' '}
                                  </span>
                                  <span className="break-words">
                                    {br.actionGuidance}
                                  </span>
                                </div>
                                <div className="font-semibold text-emerald-700 inline-flex items-center gap-1 pt-0.5">
                                  <ArrowRight className="w-3 h-3 shrink-0" />
                                  <span>
                                    {targetStep
                                      ? t.transitionToStep(targetStep.code, targetStep.title)
                                      : t.endAndCloseWorkflow}
                                  </span>
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative / Standby Branch Steps in Workflow Graph */}
      {inactiveSteps.length > 0 && (
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-700">
              {t.otherBranchStepsHeading(inactiveSteps.length)}
            </h3>
          </div>
          <div className="space-y-2">
            {inactiveSteps.map((step) => {
              const isSelected = step.id === selectedStepId;
              const isExpanded = expandedStepId === step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => handleClickStepBox(step.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/15'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                    <span className="font-bold text-emerald-700">
                      {step.code} · {t.otherSituationBranchBadge}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span>
                        {t.subtasksCountUnit(step.subtasks.length)} ·{' '}
                        {t.branchesCountUnit(step.branches.length)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                    {step.title}
                  </div>

                  {/* Show full subtasks when clicked */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 space-y-1.5">
                      <ul className="space-y-1">
                        {step.subtasks.map((st, idx) => (
                          <li
                            key={st.id}
                            className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80"
                          >
                            <div className="flex items-start gap-1.5">
                              <span className="font-mono tabular-nums font-bold text-emerald-700 shrink-0">
                                {step.code}.{idx + 1}
                              </span>
                              <span className="font-medium text-slate-900 break-words">
                                {st.title}
                              </span>
                            </div>
                            {st.note && (
                              <div className="pl-6 mt-0.5 text-[11px] text-slate-500 break-words">
                                {t.guidancePrefix} {st.note}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
