
import React from 'react';
import { type Feedback } from '../types';

interface FeedbackReportProps {
  feedback: Feedback;
}

const FeedbackReport: React.FC<FeedbackReportProps> = ({ feedback }) => {
  const scoreColor =
    feedback.fluencyScore >= 8 ? 'text-green-400' :
    feedback.fluencyScore >= 5 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-6 animate-fade-in">
      <h3 className="text-2xl font-bold text-purple-400">Conversation Feedback</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col items-center justify-center bg-slate-900 p-4 rounded-lg">
          <p className="text-slate-400 text-sm font-medium">Fluency Score</p>
          <p className={`text-6xl font-bold ${scoreColor}`}>{feedback.fluencyScore}<span className="text-3xl text-slate-500">/10</span></p>
        </div>
        <div className="md:col-span-2 bg-slate-900 p-4 rounded-lg">
          <h4 className="font-semibold text-slate-300 mb-2">Summary</h4>
          <p className="text-slate-400">{feedback.summary}</p>
        </div>
      </div>

      {feedback.corrections && feedback.corrections.length > 0 && (
        <div>
          <h4 className="text-xl font-semibold text-slate-300 mb-3">Corrections</h4>
          <div className="space-y-4">
            {feedback.corrections.map((item, index) => (
              <div key={index} className="bg-slate-900 p-4 rounded-lg">
                <p className="text-slate-400">
                  <span className="font-medium text-red-400/80 line-through">{item.original}</span>
                </p>
                <p className="text-slate-300">
                  <span className="font-medium text-green-400/90">{item.corrected}</span>
                </p>
                <p className="text-sm text-slate-500 mt-2 italic">"{item.explanation}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.suggestions && feedback.suggestions.length > 0 && (
        <div>
          <h4 className="text-xl font-semibold text-slate-300 mb-3">Suggestions</h4>
          <ul className="list-disc list-inside space-y-2 pl-2">
            {feedback.suggestions.map((item, index) => (
              <li key={index} className="text-slate-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FeedbackReport;