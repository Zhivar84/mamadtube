/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Pin, 
  CornerUpLeft, 
  Edit3, 
  Trash2, 
  Smile, 
  FileText, 
  Download, 
  ExternalLink,
  MoreVertical,
  Volume2,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, MessageDeliveryStatus, ChatUser } from '../../types/chat';
import AudioMessagePlayer from './AudioMessagePlayer';
import EmojiReactionPicker from './EmojiReactionPicker';

export interface MessageItemProps {
  message: ChatMessage;
  currentUser: ChatUser;
  searchQuery?: string;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onAttachmentClick?: (url: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  searchQuery = '',
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onAddReaction,
  onAttachmentClick
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isMe = message.senderId === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  // Highlight matches if searchQuery is present
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    if (!searchQuery.trim()) {
      return formatMarkdown(text);
    }

    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const lines = text.split('\n');

    return lines.map((line, lIdx) => {
      const parts = line.split(regex);
      return (
        <p key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>
          {parts.map((part, pIdx) => {
            if (part.toLowerCase() === query.toLowerCase()) {
              return (
                <mark
                  key={pIdx}
                  className="bg-amber-300 text-zinc-950 font-bold px-0.5 rounded shadow-xs"
                >
                  {part}
                </mark>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  // Simple Markdown Parser for bold (**text**), italics (*text*), code (`code`), and line breaks
  const formatMarkdown = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Parse inline codes `...`
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

      return (
        <p key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={pIdx} className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono text-[11px]">
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return <em key={pIdx} className="italic">{part.slice(1, -1)}</em>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  const renderDeliveryStatus = (status: MessageDeliveryStatus) => {
    switch (status) {
      case 'sending':
        return <div className="w-2.5 h-2.5 border border-indigo-200 border-t-transparent rounded-full animate-spin" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-indigo-200" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />;
      default:
        return null;
    }
  };

  return (
    <div className={`group relative flex items-start gap-2.5 sm:gap-3 my-2 sm:my-2.5 px-2 sm:px-3 py-1 transition-colors rounded-2xl max-w-full ${
      isMe ? 'flex-row-reverse' : 'flex-row'
    }`}>
      {/* Sender Avatar (only shown on non-me or group) */}
      {!isMe && (
        message.senderAvatar && message.senderAvatar.trim() !== '' ? (
          <img
            src={message.senderAvatar}
            alt={message.senderName}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 dark:ring-zinc-800 flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
            {message.senderName?.charAt(0) || 'U'}
          </div>
        )
      )}

      {/* Message Content Container */}
      <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* Author name on non-me */}
        {!isMe && (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-0.5 ml-1 select-none truncate max-w-full">
            {message.senderName}
          </span>
        )}

        {/* Reply/Quote preview */}
        {message.replyTo && (
          <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 max-w-full overflow-hidden truncate ${
            isMe 
              ? 'bg-indigo-700/40 border-white text-indigo-100' 
              : 'bg-slate-100 dark:bg-zinc-800 border-indigo-500 text-slate-700 dark:text-zinc-300'
          }`}>
            <span className="font-semibold block text-[10px] opacity-90 truncate">{message.replyTo.senderName}</span>
            <p className="truncate text-xs">{message.replyTo.content || 'Media / Voice note'}</p>
          </div>
        )}

        {/* Main Bubble & Action Toolbar wrapper */}
        <div className="relative group/bubble max-w-full">
          {/* Main Bubble */}
          <div className={`relative px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-xs text-xs leading-relaxed max-w-full break-words overflow-hidden ${
            isMe 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-none'
          }`}>
            
            {/* Pinned Badge */}
            {message.isPinned && (
              <div className="flex items-center gap-1 text-[10px] font-semibold mb-1 opacity-90 text-amber-300">
                <Pin className="w-3 h-3 fill-current" />
                <span>Pinned message</span>
              </div>
            )}

            {/* Voice Note Player */}
            {message.voiceNote && (
              <div className="my-1 max-w-full overflow-hidden">
                <AudioMessagePlayer
                  audioUrl={message.voiceNote.audioUrl}
                  duration={message.voiceNote.duration}
                  waveform={message.voiceNote.waveform}
                  isSenderMe={isMe}
                />
              </div>
            )}

            {/* File Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2 my-1 max-w-full">
                {message.attachments.map((att) => (
                  <div key={att.id} className="rounded-xl overflow-hidden max-w-full">
                    {att.type === 'image' && att.url && att.url.trim() !== '' ? (
                      <div 
                        onClick={() => onAttachmentClick && onAttachmentClick(att.url)}
                        className="cursor-pointer overflow-hidden rounded-xl group/img relative max-w-full"
                      >
                        <img 
                          src={att.url} 
                          alt={att.name} 
                          referrerPolicy="no-referrer"
                          className="max-h-60 w-full object-cover rounded-xl transition-transform group-hover/img:scale-105"
                        />
                      </div>
                    ) : att.type === 'video' && att.url && att.url.trim() !== '' ? (
                      <video 
                        src={att.url} 
                        controls 
                        className="max-h-60 rounded-xl w-full object-cover"
                      />
                    ) : (
                      <div className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border max-w-full ${
                        isMe ? 'bg-indigo-700/50 border-indigo-500' : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'
                      }`}>
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                          <div className="overflow-hidden min-w-0">
                            <p className="font-semibold text-xs truncate">{att.name}</p>
                            <span className="text-[10px] opacity-75">{att.sizeFormatted}</span>
                          </div>
                        </div>
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-black/10 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Text message with search keyword highlighting or markdown */}
            {message.content && (
              <div className="break-words select-text max-w-full overflow-hidden">
                {renderHighlightedContent(message.content)}
              </div>
            )}

            {/* Metadata Footer: timestamp + edited + status ticks */}
            <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] select-none ${
              isMe ? 'text-indigo-200' : 'text-slate-400 dark:text-zinc-500'
            }`}>
              {message.isEdited && <span className="italic">edited</span>}
              <span>{message.formattedTime}</span>
              {isMe && renderDeliveryStatus(message.deliveryStatus)}
            </div>
          </div>

          {/* Floating Hover Action Bar */}
          <div className={`absolute top-0 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto transition-opacity z-20 flex items-center gap-0.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-slate-200 dark:border-zinc-700 shadow-md rounded-xl p-0.5 sm:p-1 max-w-[calc(100vw-4rem)] ${
            isMe ? 'right-2' : 'left-2'
          }`}>
            {/* Quick Emoji Reaction button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 sm:p-1.5 text-slate-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showEmojiPicker && (
                <div className={`absolute bottom-full mb-1.5 z-30 ${isMe ? 'right-0' : 'left-0'}`}>
                  <EmojiReactionPicker
                    onSelectEmoji={(emoji) => {
                      onAddReaction(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>

            {/* Reply */}
            <button
              type="button"
              onClick={() => onReply(message)}
              className="p-1 sm:p-1.5 text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Reply"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>

            {/* Pin */}
            <button
              type="button"
              onClick={() => onTogglePin(message.id)}
              className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
                message.isPinned 
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={message.isPinned ? "Unpin message" : "Pin message"}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Edit (only me) */}
            {isMe && message.content && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="p-1 sm:p-1.5 text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete button: Visible if sent by current user OR if currentUser is Admin */}
            {(isMe || isAdmin) && (
              <button
                type="button"
                id={`delete-msg-${message.id}`}
                onClick={() => onDelete(message.id)}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isAdmin && !isMe
                    ? 'text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
                title={isAdmin && !isMe ? "Delete (Admin Override)" : "Delete message"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Emoji Reactions Tray */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 z-0 max-w-full">
            {message.reactions.map((reaction, idx) => {
              const hasMyReaction = reaction.users.includes(currentUser.id);
              return (
                <button
                  key={idx}
                  onClick={() => onAddReaction(message.id, reaction.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border shadow-xs cursor-pointer ${
                    hasMyReaction
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 font-bold scale-105'
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px]">{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default MessageItem;
