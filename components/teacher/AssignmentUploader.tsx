/**
 * components/teacher/AssignmentUploader.tsx — Placeholder for file-based assignment upload.
 * Currently shows a styled dropzone UI. File parsing logic can be extended to parse CSV/JSON question banks.
 * To test: render and verify the dropzone displays and responds to drag events.
 */

'use client';

import { useState, useRef, DragEvent } from 'react';
import { Button } from '@/components/ui/Button';

interface AssignmentUploaderProps {
  onQuestionsLoaded?: (questions: unknown[]) => void;
  acceptedFormats?: string[];
}

export function AssignmentUploader({
  onQuestionsLoaded,
  acceptedFormats = ['.json', '.csv'],
}: AssignmentUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();

      // JSON format: array of question objects
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('JSON must be an array of questions');
        onQuestionsLoaded?.(data);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parse (question_text, A, B, C, D, correct)
        const lines = text.split('\n').filter(Boolean).slice(1); // skip header
        const questions = lines.map((line) => {
          const [question_text, a, b, c, d, correct] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
          return {
            question_text,
            difficulty: 1,
            options: [
              { option_key: 'A', option_text: a, is_correct: correct === 'A' },
              { option_key: 'B', option_text: b, is_correct: correct === 'B' },
              { option_key: 'C', option_text: c, is_correct: correct === 'C' },
              { option_key: 'D', option_text: d, is_correct: correct === 'D' },
            ],
          };
        });
        onQuestionsLoaded?.(questions);
      } else {
        throw new Error('Unsupported format. Use .json or .csv');
      }
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload question bank file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-3 p-8',
          'rounded-xl border-2 border-dashed cursor-pointer',
          'transition-all duration-200',
          dragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5',
        ].join(' ')}
      >
        <span className="text-3xl" aria-hidden="true">📂</span>
        <div className="text-center">
          <p className="text-sm text-gray-300">
            Drop a file here or <span className="text-cyan-400">browse</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Accepted: {acceptedFormats.join(', ')}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          aria-hidden="true"
        />
      </div>

      {/* File status */}
      {loading && <p className="text-xs text-cyan-400 animate-pulse">Parsing {fileName}…</p>}
      {fileName && !loading && !error && (
        <p className="text-xs text-green-400">✓ Loaded: {fileName}</p>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      )}

      {/* CSV template download hint */}
      <div className="rounded-lg bg-gray-800/40 border border-white/5 p-3">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">CSV format:</span>{' '}
          <code className="text-cyan-600 font-mono">question_text,A,B,C,D,correct_key</code>
          <br />
          <span className="text-gray-600">The <code className="font-mono">correct_key</code> column should contain the correct option (A–D).</span>
        </p>
      </div>
    </div>
  );
}
