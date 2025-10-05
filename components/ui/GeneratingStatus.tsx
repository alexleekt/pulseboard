'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GeneratingStatusProps {
  isGenerating: boolean;
  label?: string;
}

export function GeneratingStatus({ isGenerating, label = 'Generating' }: GeneratingStatusProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isGenerating) {
      startRef.current = Date.now();
      setElapsedMs(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        if (startRef.current) {
          setElapsedMs(Date.now() - startRef.current);
        }
      }, 250);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (startRef.current) {
      setElapsedMs(Date.now() - startRef.current);
      startRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isGenerating]);

  if (!isGenerating) {
    return null;
  }

  const seconds = elapsedMs / 1000;
  const formatted = seconds >= 60
    ? `${(seconds / 60).toFixed(1).replace(/\.0$/, '')}m`
    : `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1)}s`;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
      <span>
        {label ? `${label}: ` : ''}{formatted}
      </span>
    </div>
  );
}
