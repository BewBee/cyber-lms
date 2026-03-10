/**
 * components/teacher/ModuleEditor.tsx — Form for creating or editing a teacher quiz module.
 * Composes QuestionForm for each question and submits to POST /api/teacher/modules.
 * To test: render <ModuleEditor teacherId="..." /> and create a module with questions.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QuestionForm } from './QuestionForm';
import { Button } from '@/components/ui/Button';
import type { QuestionFormData, ModuleFormData } from '@/types';

interface ModuleEditorProps {
  teacherId: string;
  editModuleId?: string;
  initialData?: Partial<ModuleFormData>;
  onSaved?: (moduleId: string) => void;
}

export function ModuleEditor({ teacherId, editModuleId, initialData, onSaved }: ModuleEditorProps) {
  const [moduleName, setModuleName] = useState(initialData?.module_name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [expBonus, setExpBonus] = useState(initialData?.exp_bonus_percent ?? 0);
  const [questions, setQuestions] = useState<QuestionFormData[]>(
    initialData?.questions ?? [
      {
        question_text: '',
        difficulty: 1,
        explanation: '',
        options: [
          { option_key: 'A', option_text: '', is_correct: true },
          { option_key: 'B', option_text: '', is_correct: false },
          { option_key: 'C', option_text: '', is_correct: false },
          { option_key: 'D', option_text: '', is_correct: false },
        ],
      },
    ]
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleQuestionChange = useCallback((index: number, data: QuestionFormData) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? data : q)));
  }, []);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        difficulty: 1,
        explanation: '',
        options: [
          { option_key: 'A', option_text: '', is_correct: true },
          { option_key: 'B', option_text: '', is_correct: false },
          { option_key: 'C', option_text: '', is_correct: false },
          { option_key: 'D', option_text: '', is_correct: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) return setStatus({ type: 'error', message: 'Module name is required' });
    if (questions.length === 0) return setStatus({ type: 'error', message: 'Add at least one question' });

    const invalidQ = questions.findIndex(
      (q) => !q.question_text.trim() || q.options.some((o) => !o.option_text.trim())
    );
    if (invalidQ !== -1) {
      return setStatus({ type: 'error', message: `Question ${invalidQ + 1} has empty fields` });
    }

    setLoading(true);
    setStatus(null);

    try {
      const endpoint = editModuleId
        ? `/api/teacher/modules/${editModuleId}`
        : '/api/teacher/modules';
      const method = editModuleId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          module_name: moduleName.trim(),
          description: description.trim() || undefined,
          exp_bonus_percent: expBonus,
          questions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? 'Failed to save module' });
      } else {
        setStatus({ type: 'success', message: editModuleId ? 'Module updated!' : 'Module created!' });
        onSaved?.(data.module_id ?? editModuleId ?? '');
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Module metadata */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-gray-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">Module Details</h2>

        <div>
          <label htmlFor="mod-name" className="block text-xs text-gray-400 mb-1">
            Module Name <span className="text-red-400">*</span>
          </label>
          <input
            id="mod-name"
            type="text"
            required
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            placeholder="e.g. Web Application Security"
            className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
          />
        </div>

        <div>
          <label htmlFor="mod-desc" className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            id="mod-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will students learn?"
            className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none placeholder-gray-600"
          />
        </div>

        <div>
          <label htmlFor="mod-bonus" className="block text-xs text-gray-400 mb-1">
            EXP Bonus % (0 = no bonus)
          </label>
          <input
            id="mod-bonus"
            type="number"
            min={0}
            max={100}
            value={expBonus}
            onChange={(e) => setExpBonus(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24 rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Questions ({questions.length})</h2>
          <button type="button" onClick={addQuestion}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/30 hover:border-cyan-400 px-3 py-1.5 rounded-md"
          >
            + Add Question
          </button>
        </div>
        {questions.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <QuestionForm
              index={i}
              initialData={q}
              onChange={handleQuestionChange}
              onRemove={!editModuleId && questions.length > 1 ? removeQuestion : undefined}
            />
          </motion.div>
        ))}
      </div>

      {/* Status message */}
      {status && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-sm px-4 py-2 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-500/15 border border-green-500/30 text-green-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}
          role="alert"
        >
          {status.message}
        </motion.p>
      )}

      <Button type="submit" loading={loading} fullWidth size="lg">
        {editModuleId ? 'Save Changes' : 'Create Module'}
      </Button>
    </form>
  );
}
