
import React from 'react';
import { SessionStatus } from '../types';

interface StatusIndicatorProps {
  status: SessionStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case SessionStatus.CONNECTING:
        return 'bg-yellow-500 animate-pulse';
      case SessionStatus.LISTENING:
        return 'bg-green-500';
      case SessionStatus.SPEAKING:
        return 'bg-cyan-500 animate-pulse';
      case SessionStatus.ERROR:
        return 'bg-red-500';
      case SessionStatus.API_KEY_MISSING:
        return 'bg-orange-500 animate-pulse';
      case SessionStatus.IDLE:
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} transition-colors duration-300`}></div>
      <span className="text-slate-300 text-sm font-medium">{status}</span>
    </div>
  );
};

export default StatusIndicator;