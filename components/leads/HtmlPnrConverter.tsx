'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Eye, Code2, RotateCcw, Info } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

export interface HtmlPnrConverterProps {
  /**
   * Captured itinerary HTML (as pasted from pnrconverter.com / pnrdecoder.com).
   * Stored on the lead and rendered back as a preview.
   */
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

/**
 * Paste-and-preview PNR itinerary block.
 *
 * The user converts a PNR on an external site (pnrconverter.com /
 * pnrdecoder.com), selects the rendered itinerary, and pastes it into the
 * contenteditable surface below. We capture the clipboard's `text/html`
 * verbatim — the same data Gmail's compose box receives on paste — so tables,
 * inline styles and airline logo <img> tags all survive. The captured HTML is
 * stored on the lead and shown back later.
 */
export const HtmlPnrConverter: React.FC<HtmlPnrConverterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [view, setView] = useState<'editor' | 'code'>('editor');
  const editorRef = useRef<HTMLDivElement>(null);

  const hasContent = value.trim().length > 0;
  const safeHtml = useMemo(() => sanitizeHtml(value), [value]);

  // Keep the contenteditable in sync when `value` changes from the outside
  // (e.g. form reset, or loading an existing lead). We avoid clobbering the DOM
  // while the user is actively typing by only writing when it differs.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  /**
   * Capture pasted HTML verbatim. We take the clipboard's `text/html` (what the
   * source page rendered, images included) and insert it, falling back to plain
   * text. This mirrors what Gmail receives on paste.
   */
  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      if (!html && !text) return;
      e.preventDefault();
      const incoming = html
        ? sanitizeHtml(html)
        : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      // Insert at the caret so multiple pastes append naturally.
      document.execCommand('insertHTML', false, incoming);
      onChange(editorRef.current?.innerHTML || '');
    },
    [onChange]
  );

  const syncFromEditor = useCallback(() => {
    onChange(editorRef.current?.innerHTML || '');
  }, [onChange]);

  const clearEditor = useCallback(() => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    onChange('');
  }, [onChange]);

  return (
    <div className={`space-y-3 rounded-btn border border-ember-border bg-ember-surface p-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ember-primary" />
          <label className="text-xs font-bold uppercase tracking-wider text-ember-text-primary">
            PNR Converter (Paste Itinerary)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-btn bg-white border border-ember-border">
            <button
              type="button"
              onClick={() => setView('editor')}
              className={`flex items-center gap-1 px-2 py-1 rounded-btn text-[11px] font-bold transition-all ${
                view === 'editor'
                  ? 'bg-ember-primary text-white shadow-sm'
                  : 'text-ember-neutral hover:text-ember-text-primary'
              }`}
            >
              <Eye className="w-3 h-3" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setView('code')}
              className={`flex items-center gap-1 px-2 py-1 rounded-btn text-[11px] font-bold transition-all ${
                view === 'code'
                  ? 'bg-ember-primary text-white shadow-sm'
                  : 'text-ember-neutral hover:text-ember-text-primary'
              }`}
            >
              <Code2 className="w-3 h-3" />
              HTML
            </button>
          </div>
          {hasContent && (
            <button
              type="button"
              onClick={clearEditor}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-ember-neutral hover:text-red-600 rounded-btn transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-ember-neutral">
        <Info className="w-3.5 h-3.5 text-ember-primary shrink-0 mt-px" />
        <span>
          Convert your PNR on pnrconverter.com, select the rendered itinerary, and paste it
          (Ctrl/Cmd+V) into the box below. Tables, styles and airline logos are kept exactly
          as shown — the itinerary is saved with the lead.
        </span>
      </p>

      {/* Contenteditable paste surface (rich) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={onPaste}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        role="textbox"
        aria-multiline="true"
        aria-label="Paste itinerary here"
        tabIndex={0}
        data-placeholder="Paste the itinerary here…"
        className={`pnr-html-editor min-h-[180px] max-h-[420px] overflow-auto p-3 rounded-btn bg-white border border-dashed border-ember-border text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary ${
          view === 'code' ? 'hidden' : ''
        }`}
        style={{ outline: 'none' }}
      />

      {/* HTML source view */}
      {view === 'code' && (
        <textarea
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Paste or edit the HTML itinerary here…"
          className="w-full font-mono text-xs p-3 rounded-btn bg-ember-surface-raised border border-ember-border text-ember-text-primary focus:outline-none focus:border-ember-primary focus:ring-1 focus:ring-ember-primary transition-all resize-y placeholder:text-stone-400 leading-relaxed"
        />
      )}

      {/* Read-back preview (sanitized) */}
      {hasContent && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ember-neutral">Preview</div>
          <div className="rounded-btn border border-ember-border bg-white p-3 max-h-[420px] overflow-auto shadow-inner">
            <div
              className="pnr-html-preview text-xs text-ember-text-primary"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
