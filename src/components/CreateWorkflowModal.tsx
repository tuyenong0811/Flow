import React, { useState } from 'react';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import { X, Plus, GitBranch } from 'lucide-react';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkflow: (payload: {
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
  }) => void;
  lang?: AppLanguage;
}

export const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkflow,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Vận hành & Quản trị');
  const [description, setDescription] = useState('');
  const [rootStepTitle, setRootStepTitle] = useState('');
  const [rootStepOwner, setRootStepOwner] = useState('Trưởng nhóm Phụ trách');
  const [subtasksText, setSubtasksText] = useState(
    'Thu thập đầy đủ thông tin và hồ sơ đầu vào\nKiểm tra các điều kiện bắt buộc trước khi xử lý'
  );
  const [secondStepConditionLabel, setSecondStepConditionLabel] = useState(
    'Tình huống chuẩn: Đủ điều kiện tiêu chuẩn'
  );
  const [secondStepTitle, setSecondStepTitle] = useState(
    'Thực hiện phê duyệt & triển khai theo luồng chuẩn'
  );
  const [altStepConditionLabel, setAltStepConditionLabel] = useState(
    'Tình huống phát sinh / Ngoại lệ: Cần thẩm định bổ sung'
  );
  const [altStepTitle, setAltStepTitle] = useState(
    'Chuyển hội đồng chuyên môn xử lý tình huống đặc biệt'
  );
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên quy trình công việc.');
      return;
    }
    if (!rootStepTitle.trim()) {
      setError('Vui lòng nhập tên Bước 01 (Bước mở đầu quy trình).');
      return;
    }

    const rootSubtasks = subtasksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onCreateWorkflow({
      title,
      category,
      description,
      rootStepTitle,
      rootStepDescription:
        'Hoàn thành các bước con bắt buộc dưới đây trước khi chọn nhánh tình huống tiếp theo.',
      rootStepOwner,
      rootSubtasks,
      secondStepTitle,
      secondStepConditionLabel,
      altStepTitle,
      altStepConditionLabel,
    });

    setTitle('');
    setDescription('');
    setRootStepTitle('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workflow-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 id="create-workflow-modal-title" className="text-base font-bold text-slate-900">
              {t.createWorkflowModalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.createWorkflowModalSubtitle}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="md:col-span-2">
              <label htmlFor="wf-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                {t.newWorkflowNameLabel} *
              </label>
              <input
                id="wf-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="wf-category-input" className="block text-xs font-semibold text-slate-700 mb-1">
                {t.departmentGroupLabel}
              </label>
              <input
                id="wf-category-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="wf-desc-input" className="block text-xs font-semibold text-slate-700 mb-1">
              {t.workflowGoalDescLabel}
            </label>
            <input
              id="wf-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              {t.step01ConfigHeading}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2">
                <label htmlFor="wf-root-step-title" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.step01NameLabel}
                </label>
                <input
                  id="wf-root-step-title"
                  type="text"
                  value={rootStepTitle}
                  onChange={(e) => setRootStepTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label htmlFor="wf-root-owner" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.ownerRoleLabel}
                </label>
                <input
                  id="wf-root-owner"
                  type="text"
                  value={rootStepOwner}
                  onChange={(e) => setRootStepOwner(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="wf-root-subtasks" className="block text-xs font-medium text-slate-700 mb-1">
                {t.requiredSubtasksBeforeNextLabel}
              </label>
              <textarea
                id="wf-root-subtasks"
                rows={2}
                value={subtasksText}
                onChange={(e) => setSubtasksText(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              <span>{t.twoBranchesConfigHeading}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="wf-branch1-cond" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branch1ConditionLabel}
                </label>
                <input
                  id="wf-branch1-cond"
                  type="text"
                  value={secondStepConditionLabel}
                  onChange={(e) => setSecondStepConditionLabel(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="wf-branch1-step" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branch1NextStepLabel}
                </label>
                <input
                  id="wf-branch1-step"
                  type="text"
                  value={secondStepTitle}
                  onChange={(e) => setSecondStepTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="wf-branch2-cond" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branch2ConditionLabel}
                </label>
                <input
                  id="wf-branch2-cond"
                  type="text"
                  value={altStepConditionLabel}
                  onChange={(e) => setAltStepConditionLabel(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="wf-branch2-step" className="block text-xs font-medium text-slate-700 mb-1">
                  {t.branch2NextStepLabel}
                </label>
                <input
                  id="wf-branch2-step"
                  type="text"
                  value={altStepTitle}
                  onChange={(e) => setAltStepTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
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
              <span>{t.createNewWorkflowBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
