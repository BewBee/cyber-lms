/**
 * components/teacher/QuestionForm.tsx — Form for creating/editing a single quiz question.
 * Manages 4 answer options (A-D) with radio selection for correct answer.
 * To test: render <QuestionForm index={0} onChange={fn} /> and fill in fields.
 */

'use client';

import { useState, useEffect } from 'react';
import type { QuestionFormData, OptionKey } from '@/types';

interface QuestionFormProps {
  index: number;
  initialData?: Partial<QuestionFormData>;
  onChange: (index: number, data: QuestionFormData) => void;
  onRemove?: (index: number) => void;
}

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

const emptyQuestion = (): QuestionFormData => ({
  question_text: '',
  difficulty: 1,
  explanation: '',
  options: OPTION_KEYS.map((k) => ({ option_key: k, option_text: '', is_correct: k === 'A' })),
});

export function QuestionForm({ index, initialData, onChange, onRemove }: QuestionFormProps) {
  const [data, setData] = useState<QuestionFormData>(() => ({
    ...emptyQuestion(),
    ...initialData,
  }));

  useEffect(() => {
    onChange(index, data);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field: keyof QuestionFormData, value: QuestionFormData[typeof field]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateOption = (optKey: OptionKey, text: string) => {
    setData((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o.option_key === optKey ? { ...o, option_text: text } : o
      ),
    }));
  };

  const setCorrect = (optKey: OptionKey) => {
    setData((prev) => ({
      ...prev,
      options: prev.options.map((o) => ({ ...o, is_correct: o.option_key === optKey })),
    }));
  };

  const correctKey = data.options.find((o) => o.is_correct)?.option_key ?? 'A';

  return (
    <fieldset className="rounded-xl border border-white/10 bg-gray-800/40 p-5 space-y-4">
      <legend className="text-sm font-semibold text-cyan-400 px-2">
        Question {index + 1}
      </legend>

      {/* Question text */}
      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor={`q-text-${index}`}>
          Question Text <span className="text-red-400">*</span>
        </label>
        <textarea
          id={`q-text-${index}`}
          required
          rows={3}
          value={data.question_text}
          onChange={(e) => updateField('question_text', e.target.value)}
          placeholder="Enter the question…"
          className="w-full rounded-lg bg-gray-900 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none placeholder-gray-600"
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor={`q-diff-${index}`}>
          Difficulty (1–5)
        </label>
        <select
          id={`q-diff-${index}`}
          value={data.difficulty}
          onChange={(e) => updateField('difficulty', parseInt(e.target.value))}
          className="rounded-lg bg-gray-900 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
        >
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400">Answer Options — select the correct one</p>
        {OPTION_KEYS.map((key) => {
          const opt = data.options.find((o) => o.option_key === key)!;
          return (
            <div key={key} className="flex items-center gap-3">
              <input
                type="radio"
                id={`q-correct-${index}-${key}`}
                name={`q-correct-${index}`}
                checked={correctKey === key}
                onChange={() => setCorrect(key)}
                className="accent-cyan-500 h-4 w-4 flex-shrink-0"
                aria-label={`Mark option ${key} as correct`}
              />
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-700 text-xs font-bold text-gray-300 flex-shrink-0">
                {key}
              </span>
              <input
                type="text"
                value={opt.option_text}
                onChange={(e) => updateOption(key, e.target.value)}
                placeholder={`Option ${key}`}
                className="flex-1 rounded-lg bg-gray-900 border border-white/10 text-white text-sm px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
              />
            </div>
          );
        })}
      </div>

      {/* Explanation (optional) */}
      <div>
        <label className="block text-xs text-gray-400 mb-1" htmlFor={`q-exp-${index}`}>
          Explanation (shown after answer)
        </label>
        <textarea
          id={`q-exp-${index}`}
          rows={2}
          value={data.explanation ?? ''}
          onChange={(e) => updateField('explanation', e.target.value)}
          placeholder="Optional explanation for the correct answer…"
          className="w-full rounded-lg bg-gray-900 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none placeholder-gray-600"
        />
      </div>

      {/* Remove button */}
      {onRemove && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove question
          </button>
        </div>
      )}
    </fieldset>
  );
}
