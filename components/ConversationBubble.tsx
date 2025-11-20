

import React from 'react';
import { type ConversationEntry } from '../types';

interface ConversationBubbleProps {
  entry: ConversationEntry;
}

const ConversationBubble: React.FC<ConversationBubbleProps> = ({ entry }) => {
  const isUser = entry.speaker === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center font-bold text-slate-900">
          AI
        </div>
      )}
      <div className={`max-w-md lg:max-w-lg p-4 rounded-2xl ${isUser ? 'bg-slate-700 rounded-br-none' : 'bg-slate-800 rounded-bl-none'}`}>
        <p className="text-slate-200">{entry.text}</p>
      </div>
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center font-bold">
          You
        </div>
      )}
    </div>
  );
};

export default ConversationBubble;