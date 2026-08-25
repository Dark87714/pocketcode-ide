import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const accessKey = (import.meta as any).env?.VITE_WEB3FORMS_ACCESS_KEY || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    if (!accessKey) {
      alert('Feedback service is not configured (missing VITE_WEB3FORMS_ACCESS_KEY in environment).');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: 'New Feedback from PocketCode IDE',
          message: feedback,
        }),
      });

      const json = await response.json();
      
      if (response.status === 200) {
        setSubmitted(true);
        timerRef.current = setTimeout(() => {
          setSubmitted(false);
          setFeedback('');
          onClose();
        }, 2000);
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('Failed to send feedback:', error);
      alert(`Failed to send feedback: ${error.message || 'Check console for details'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="w-full max-w-md bg-[#252526] border border-[#3c3c3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Provide Feedback</h3>
              <p className="text-xs text-[#858585]">Help us improve PocketCode IDE.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#858585] hover:text-white rounded">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-emerald-400">
              <Send size={48} className="mb-4" />
              <p className="font-bold">Thank you for your feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think, report a bug, or request a feature..."
                  className="w-full h-32 bg-[#1e1e1e] border border-[#333333] rounded-lg p-3 text-sm text-white placeholder-[#858585] focus:border-sky-500 focus:outline-none resize-none transition-colors"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-[#cccccc] hover:text-white bg-[#333333] hover:bg-[#3c3c3c] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#007acc] hover:bg-[#005f9e] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
