import React from 'react';

interface FormattedMateriTextProps {
  content: string;
  className?: string;
  justify?: boolean;
}

/**
 * FormattedMateriText renders structured learning material with:
 * 1. Microsoft Word-style hanging indent (nomor/huruf di pinggir kiri,
 *    seluruh baris teks berikutnya otomatis tersambung lurus di bawah teks awal, bukan di bawah nomor).
 * 2. Strict column-fitting (break-words, min-w-0, no horizontal overflow).
 * 3. Support for numbered lists (1., 2.), sub-lists (a., b.), roman numerals (i., ii.),
 *    bullet points (-, *, •), and subheadings (###).
 */
export const FormattedMateriText: React.FC<FormattedMateriTextProps> = ({
  content,
  className = '',
  justify = true,
}) => {
  if (!content || !content.trim()) return null;

  // Split lines
  const lines = content.split('\n');

  return (
    <div
      className={`w-full max-w-full min-w-0 space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal ${
        justify ? 'text-justify' : 'text-left'
      } ${className}`}
      style={{
        textAlignLast: 'left',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-2 w-full" />;
        }

        // 1. Markdown Heading: "### ", "## ", "# "
        const headingMatch = trimmed.match(/^(#{1,4})\s*(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingText = headingMatch[2];
          return (
            <h5
              key={index}
              className={`w-full max-w-full min-w-0 font-extrabold text-slate-900 mt-3.5 mb-1.5 text-left tracking-tight break-words ${
                level <= 2 ? 'text-sm sm:text-base text-emerald-950 border-b border-slate-200 pb-1' : 'text-xs sm:text-sm text-slate-900'
              }`}
            >
              {headingText}
            </h5>
          );
        }

        // 2. Microsoft Word Numbered List: e.g. "1. ", "2) ", "10. "
        // Regex matches 1-3 digits followed by '.' or ')'
        const numberMatch = trimmed.match(/^(\d{1,3}[\.\)])\s+(.+)$/);
        if (numberMatch) {
          const rawPrefix = numberMatch[1];
          // Standardize to "1." format
          const numBadge = rawPrefix.endsWith(')') ? rawPrefix : rawPrefix.endsWith('.') ? rawPrefix : `${rawPrefix}.`;
          const restOfLine = numberMatch[2];
          const isLarge = numBadge.length > 3;

          return (
            <div
              key={index}
              className="flex items-start gap-2.5 my-1 w-full max-w-full min-w-0"
            >
              {/* Hanging Indent Number Prefix (MS Word style) */}
              <span
                className={`shrink-0 font-bold text-slate-900 select-none text-left pt-0.5 font-sans ${
                  isLarge ? 'w-7 sm:w-8 text-[11px] sm:text-xs' : 'w-6 text-xs sm:text-sm'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {numBadge}
              </span>
              {/* Text content wrapped cleanly; line 2 starts directly under line 1 text */}
              <div
                className="flex-1 w-full max-w-full min-w-0 break-words leading-relaxed text-justify hyphens-auto"
                style={{ textAlignLast: 'left', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {renderFormattedInline(restOfLine)}
              </div>
            </div>
          );
        }

        // 3. Alphabetical Sub-List: e.g. "a. ", "b) ", "A. "
        const alphaMatch = trimmed.match(/^([a-zA-Z][\.\)])\s+(.+)$/);
        if (alphaMatch) {
          const rawPrefix = alphaMatch[1];
          const alphaBadge = rawPrefix.endsWith(')') ? rawPrefix : `${rawPrefix.replace(/[\.\)]/, '')}.`;
          const restOfLine = alphaMatch[2];

          return (
            <div
              key={index}
              className="flex items-start gap-2 my-1 pl-4 sm:pl-6 w-full max-w-full min-w-0"
            >
              {/* Hanging Indent Letter Prefix (MS Word style) */}
              <span className="w-5 sm:w-6 shrink-0 font-bold text-slate-800 select-none text-left pt-0.5 font-sans text-xs sm:text-sm">
                {alphaBadge}
              </span>
              <div
                className="flex-1 w-full max-w-full min-w-0 break-words leading-relaxed text-justify hyphens-auto"
                style={{ textAlignLast: 'left', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {renderFormattedInline(restOfLine)}
              </div>
            </div>
          );
        }

        // 4. Roman Numeral Sub-List: e.g. "i. ", "ii. ", "I. "
        const romanMatch = trimmed.match(/^((?:[ivxIVX]+)[\.\)])\s+(.+)$/);
        if (romanMatch) {
          const rawPrefix = romanMatch[1];
          const restOfLine = romanMatch[2];

          return (
            <div
              key={index}
              className="flex items-start gap-2 my-1 pl-6 sm:pl-8 w-full max-w-full min-w-0"
            >
              <span className="w-6 sm:w-7 shrink-0 font-bold text-slate-700 select-none text-left pt-0.5 font-sans text-xs sm:text-sm">
                {rawPrefix}
              </span>
              <div
                className="flex-1 w-full max-w-full min-w-0 break-words leading-relaxed text-justify hyphens-auto"
                style={{ textAlignLast: 'left', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {renderFormattedInline(restOfLine)}
              </div>
            </div>
          );
        }

        // 5. Bullet Points: "- ", "* ", "• "
        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div
              key={index}
              className="flex items-start gap-2.5 my-1 pl-3 sm:pl-4 w-full max-w-full min-w-0"
            >
              <span className="w-4 shrink-0 font-black text-emerald-600 select-none text-center pt-0.5 text-xs sm:text-sm">
                •
              </span>
              <div
                className="flex-1 w-full max-w-full min-w-0 break-words leading-relaxed text-justify hyphens-auto"
                style={{ textAlignLast: 'left', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {renderFormattedInline(bulletMatch[1])}
              </div>
            </div>
          );
        }

        // 6. Regular Paragraph (Word justified text, guaranteed inside column bounds)
        return (
          <p
            key={index}
            className="w-full max-w-full min-w-0 leading-relaxed text-justify break-words my-1 hyphens-auto"
            style={{ textAlignLast: 'left', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

function renderFormattedInline(text: string): React.ReactNode {
  // Simple parser for bold **text** or *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

