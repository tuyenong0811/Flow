import React, { useState } from 'react';
import { WorkflowStep } from '../utils/workflowTypes';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import { X, Plus } from 'lucide-react';

interface AddStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSteps: WorkflowStep[];
  defaultParentStepId: string;
  onAddStep: (payload: {
    title: string;
    description: string;
    ownerRole: string;
    initialSubtasks: string[];
    connectFromStepId?: string;
    connectBranchLabel?: string;
    connectBranchCondition?: string;
  }) => void;
  lang?: AppLanguage;
}

export const AddStepModal: React.FC<AddStepModalProps> = ({
  isOpen,
  onClose,
  existingSteps,
  defaultParentStepId,
  onAddStep,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerRole, setOwnerRole] = useState('Chuyên viên Phụ trách');
  const [subtasksText, setSubtasksText] = useState(
    'Kiểm tra điều kiện đầu vào của bước\nThực hiện xử lý nghiệp vụ chính\nGhi nhận kết quả nghiệm thu'
  );
  const [connectFromStepId, setConnectFromStepId] = useState(defaultParentStepId);
  const [connectBranchLabel, setConnectBranchLabel] = useState('');
  const [connectBranchCondition, setConnectBranchCondition] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên bước công việc mới.');
      return;
    }

    const initialSubtasks = subtasksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onAddStep({
      title,
      description,
      ownerRole,
      initialSubtasks,
      connectFromStepId: connectFromStepId || undefined,
      connectBranchLabel,
      connectBranchCondition,
    });

    setTitle('');
    setDescription('');
    setConnectBranchLabel('');
    setConnectBranchCondition('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-step-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 id="add-step-modal-title" className="text-base font-bold text-slate-900">
              {t.addStepModalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.addStepModalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancelBtn}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="new-step-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {t.stepTitleLabel} *
            </label>
            <input
              id="new-step-name"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="new-step-owner" className="block text-xs font-semibold text-slate-700 mb-1">
              {t.ownerRoleLabel}
            </label>
            <input
              id="new-step-owner"
              type="text"
              value={ownerRole}
              onChange={(e) => setOwnerRole(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="new-step-desc" className="block text-xs font-semibold text-slate-700 mb-1">
              {t.stepDescriptionGuideLabel}
            </label>
            <input
              id="new-step-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="new-step-subtasks-list" className="block text-xs font-semibold text-slate-700 mb-1">
              {t.requiredSubtasksBeforeNextLabel}
            </label>
            <textarea
              id="new-step-subtasks-list"
              rows={3}
              value={subtasksText}
              onChange={(e) => setSubtasksText(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div>
              <label htmlFor="connect-from-select" className="block text-xs font-semibold text-slate-700 mb-1">
                {t.connectFromWhichStepLabel}
              </label>
              <select
                id="connect-from-select"
                value={connectFromStepId}
                onChange={(e) => setConnectFromStepId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="">{t.noAutoConnectOption}</option>
                {existingSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t.connectFromStepOption(s.code, s.title)}
                  </option>
                ))}
              </select>
            </div>

            {connectFromStepId && (
              <div>
                <label htmlFor="connect-branch-label" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.connectBranchLabelInput}
                </label>
                <input
                  id="connect-branch-label"
                  type="text"
                  value={connectBranchLabel}
                  onChange={(e) => setConnectBranchLabel(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addNewStepToWorkflowBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
