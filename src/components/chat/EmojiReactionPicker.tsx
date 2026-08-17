/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface EmojiReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '👀', '🙌', '💡', '✨'];

export default function EmojiReactionPicker({ onSelectEmoji, onClose }: EmojiReactionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 5 }}
      className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 z-30 max-w-[90vw] overflow-x-auto"
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelectEmoji(emoji);
            onClose();
          }}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-base sm:text-lg hover:scale-125 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
