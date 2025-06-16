import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ToastSuccessProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const ToastSuccess: React.FC<ToastSuccessProps> = ({
  message,
  isVisible,
  onClose,
  duration = 4000
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, onClose, duration]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={clsx(
          'bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm transition-all duration-300',
          isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        )}
      >
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 text-green-400 hover:text-green-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};