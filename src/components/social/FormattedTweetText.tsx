/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormattedTweetTextProps {
  text: string;
  onTagClick?: (tag: string) => void;
  onMentionClick?: (handle: string) => void;
  className?: string;
}

export default function FormattedTweetText({
  text,
  onTagClick,
  onMentionClick,
  className = 'text-sm text-zinc-100 leading-relaxed break-words whitespace-pre-wrap',
}: FormattedTweetTextProps) {
  if (!text) return null;

  // Regex to match URLs, hashtags, and mentions
  const tokenRegex = /(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_]+)|(@[a-zA-Z0-9_]+)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Push plain text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith('http://') || matchedStr.startsWith('https://')) {
      // URL
      let displayUrl = matchedStr.replace(/^https?:\/\/(www\.)?/, '');
      if (displayUrl.length > 28) {
        displayUrl = displayUrl.substring(0, 25) + '...';
      }
      parts.push(
        <a
          key={match.index}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
        >
          {displayUrl}
        </a>
      );
    } else if (matchedStr.startsWith('#')) {
      // Hashtag
      const tagClean = matchedStr.substring(1).toLowerCase();
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            if (onTagClick) onTagClick(tagClean);
          }}
          className="text-sky-400 hover:underline cursor-pointer font-medium"
        >
          {matchedStr}
        </span>
      );
    } else if (matchedStr.startsWith('@')) {
      // Mention
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            if (onMentionClick) onMentionClick(matchedStr);
          }}
          className="text-sky-400 hover:underline cursor-pointer font-medium"
        >
          {matchedStr}
        </span>
      );
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <div className={className}>{parts}</div>;
}
