import React from 'react';

/**
 * Handles Microsoft Word-style automatic numbering on Enter key for any textarea:
 * - Continuing numbering: '1. Text' -> Enter -> '2. '
 * - Continuing lettering: 'a. Text' -> Enter -> 'b. '
 * - Continuing bullets: '- Text' -> Enter -> '- '
 * - Exiting list: Pressing Enter on empty item (e.g. '2. ') cancels the prefix and starts a normal newline.
 */
export function handleAutoNumberKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  onChange: (newValue: string) => void
) {
  if (e.key !== 'Enter' || e.shiftKey) {
    return;
  }

  const target = e.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;

  if (start !== end) {
    return; // Don't intercept if user has text selected
  }

  const textBeforeCursor = currentValue.slice(0, start);
  const textAfterCursor = currentValue.slice(start);
  const lastLineBreak = textBeforeCursor.lastIndexOf('\n');
  const currentLine = lastLineBreak === -1 ? textBeforeCursor : textBeforeCursor.slice(lastLineBreak + 1);

  // 1. Empty numbered item (e.g. user is on "2. " with nothing after, hits Enter to finish list)
  const emptyNumberMatch = currentLine.match(/^(\s*)(\d+[\.\)])\s*$/);
  if (emptyNumberMatch) {
    e.preventDefault();
    const lineStartPos = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
    const newValue = currentValue.slice(0, lineStartPos) + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = lineStartPos;
    }, 0);
    return;
  }

  // 2. Empty letter item (e.g. "b. ")
  const emptyAlphaMatch = currentLine.match(/^(\s*)([a-zA-Z][\.\)])\s*$/);
  if (emptyAlphaMatch) {
    e.preventDefault();
    const lineStartPos = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
    const newValue = currentValue.slice(0, lineStartPos) + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = lineStartPos;
    }, 0);
    return;
  }

  // 3. Empty bullet item (e.g. "- ")
  const emptyBulletMatch = currentLine.match(/^(\s*)([-*•])\s*$/);
  if (emptyBulletMatch) {
    e.preventDefault();
    const lineStartPos = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
    const newValue = currentValue.slice(0, lineStartPos) + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = lineStartPos;
    }, 0);
    return;
  }

  // 4. Numbered list with content: "1. Balikan lengan..." -> Enter -> "\n2. "
  const numberMatch = currentLine.match(/^(\s*)(\d+)([\.\)])\s+(.*)$/);
  if (numberMatch) {
    e.preventDefault();
    const indent = numberMatch[1];
    const num = parseInt(numberMatch[2], 10);
    const separator = numberMatch[3];
    const nextPrefix = `\n${indent}${num + 1}${separator} `;

    const newValue = textBeforeCursor + nextPrefix + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + nextPrefix.length;
    }, 0);
    return;
  }

  // 5. Lowercase letter list: "a. ..." -> Enter -> "\nb. "
  const lowerAlphaMatch = currentLine.match(/^(\s*)([a-z])([\.\)])\s+(.*)$/);
  if (lowerAlphaMatch) {
    e.preventDefault();
    const indent = lowerAlphaMatch[1];
    const letter = lowerAlphaMatch[2];
    const separator = lowerAlphaMatch[3];
    const nextChar = letter === 'z' ? 'aa' : String.fromCharCode(letter.charCodeAt(0) + 1);
    const nextPrefix = `\n${indent}${nextChar}${separator} `;

    const newValue = textBeforeCursor + nextPrefix + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + nextPrefix.length;
    }, 0);
    return;
  }

  // 6. Uppercase letter list: "A. ..." -> Enter -> "\nB. "
  const upperAlphaMatch = currentLine.match(/^(\s*)([A-Z])([\.\)])\s+(.*)$/);
  if (upperAlphaMatch) {
    e.preventDefault();
    const indent = upperAlphaMatch[1];
    const letter = upperAlphaMatch[2];
    const separator = upperAlphaMatch[3];
    const nextChar = letter === 'Z' ? 'AA' : String.fromCharCode(letter.charCodeAt(0) + 1);
    const nextPrefix = `\n${indent}${nextChar}${separator} `;

    const newValue = textBeforeCursor + nextPrefix + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + nextPrefix.length;
    }, 0);
    return;
  }

  // 7. Bullet list: "- ..." or "• ..." -> Enter -> "\n- "
  const bulletMatch = currentLine.match(/^(\s*)([-*•])\s+(.*)$/);
  if (bulletMatch) {
    e.preventDefault();
    const indent = bulletMatch[1];
    const bullet = bulletMatch[2];
    const nextPrefix = `\n${indent}${bullet} `;

    const newValue = textBeforeCursor + nextPrefix + textAfterCursor;
    onChange(newValue);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + nextPrefix.length;
    }, 0);
    return;
  }
}

/**
 * Appends or inserts a formatting prefix to the current value
 */
export function insertAutoNumberToken(
  currentValue: string,
  type: 'number' | 'alpha' | 'bullet' | 'heading'
): string {
  const val = currentValue || '';
  const lines = val.split('\n');

  if (type === 'number') {
    // Determine next number
    let maxNum = 0;
    for (const l of lines) {
      const m = l.trim().match(/^(\d+)[\.\)]/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    const prefix = val.length === 0 || val.endsWith('\n') ? `${nextNum}. ` : `\n${nextNum}. `;
    return val + prefix;
  }

  if (type === 'alpha') {
    let lastChar = '';
    for (const l of lines) {
      const m = l.trim().match(/^([a-z])[\.\)]/);
      if (m) {
        lastChar = m[1];
      }
    }
    const nextChar = lastChar ? String.fromCharCode(lastChar.charCodeAt(0) + 1) : 'a';
    const prefix = val.length === 0 || val.endsWith('\n') ? `${nextChar}. ` : `\n${nextChar}. `;
    return val + prefix;
  }

  if (type === 'bullet') {
    const prefix = val.length === 0 || val.endsWith('\n') ? '- ' : '\n- ';
    return val + prefix;
  }

  if (type === 'heading') {
    const prefix = val.length === 0 || val.endsWith('\n\n') ? '### Sub Judul Materi\n' : '\n\n### Sub Judul Materi\n';
    return val + prefix;
  }

  return val;
}
