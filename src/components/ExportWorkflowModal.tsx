import React, { useMemo, useRef, useState } from 'react';
import { Workflow } from '../utils/workflowTypes';
import { serializeWorkflowToJson, parseImportedWorkflowJson } from '../utils/workflowEngine';
import { AppLanguage, UI_TRANSLATIONS } from '../utils/i18n';
import {
  X,
  Download,
  Copy,
  Check,
  Upload,
  FileJson,
  BookOpen,
  ShieldCheck,
  Share2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface ExportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow;
  onImportWorkflow: (importedWorkflow: Workflow) => void;
  lang?: AppLanguage;
}

export const ExportWorkflowModal: React.FC<ExportWorkflowModalProps> = ({
  isOpen,
  onClose,
  workflow,
  onImportWorkflow,
  lang = 'vi',
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportResult = useMemo(() => {
    return serializeWorkflowToJson(workflow);
  }, [workflow]);

  if (!isOpen) return null;

  const handleDownloadFile = () => {
    const blob = new Blob([exportResult.jsonContent], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportResult.jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = exportResult.jsonContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = String(event.target?.result || '');
        const parsed = parseImportedWorkflowJson(content);
        onImportWorkflow(parsed);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'File JSON không hợp lệ.'
        );
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setImportError('Không thể đọc file JSON.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const stepCount = Object.keys(workflow.steps).length;

  return (
    <div
      data-testid="export-workflow-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileJson className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {t.exportModalTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t.exportModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-export-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t.closeBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Primary Export Actions Strip */}
          <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  JSON v1.0
                </span>
                <span
                  data-testid="export-filename-badge"
                  className="text-xs font-mono font-semibold text-emerald-900 dark:text-emerald-200 truncate"
                >
                  {exportResult.filename}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 truncate">
                {workflow.title} · {t.stepsCountUnit(stepCount)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="copy-json-btn"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {t.copiedJsonSuccess}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.copyJsonContentBtn}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="download-json-file-btn"
                onClick={handleDownloadFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.downloadJsonFileBtn}</span>
              </button>
            </div>
          </div>

          {/* Usage Guide (3 Steps) */}
          <div
            data-testid="export-usage-guide"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.usageGuideHeading}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Step 1: Backup */}
              <div className="p-2.5 rounded-md bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.guideStep1Title}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.guideStep1Desc}
                </p>
              </div>

              {/* Step 2: Share */}
              <div className="p-2.5 rounded-md bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.guideStep2Title}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.guideStep2Desc}
                </p>
              </div>

              {/* Step 3: Restore / Import */}
              <div className="p-2.5 rounded-md bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.guideStep3Title}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.guideStep3Desc}
                </p>
              </div>
            </div>
          </div>

          {/* Import / Restore from JSON File */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.importJsonSectionTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {exportResult.packageData.usageGuide.howToRestore}
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                data-testid="import-json-file-input"
              />
              <button
                type="button"
                data-testid="trigger-import-json-btn"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t.importJsonBtn}</span>
              </button>
            </div>
          </div>

          {importError && (
            <div
              data-testid="import-json-error"
              className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* JSON Content Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.jsonPreviewLabel}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {exportResult.jsonContent.length.toLocaleString()} bytes
              </span>
            </div>
            <pre
              data-testid="export-json-preview"
              className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-52 border border-slate-800"
            >
              {exportResult.jsonContent}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
