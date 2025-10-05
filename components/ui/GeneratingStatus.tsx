'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GeneratingStatusProps {
  isGenerating: boolean;
  label?: string;
}

export function GeneratingStatus({ isGenerating, label = 'Generating' }: GeneratingStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isGenerating) {
      setStartTime(Date.now());
      setElapsed(0);

      const interval = setInterval(() => {
        if (startTime) {
          setElapsed((Date.now() - startTime) / 1000);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      if (startTime) {
        // Show final time with 2 decimal places when complete
        const final = ((Date.now() - startTime) / 1000).toFixed(2);
        setElapsed(parseFloat(final));
      }
      setStartTime(null);
    }
  }, [isGenerating, startTime]);

  if (!isGenerating && elapsed === 0) return null;

  const displayTime = isGenerating
    ? Math.round(elapsed) + 's'
    : elapsed.toFixed(2) + 's';

  return (
    <div className="flex items-center gap-2 text-sm">
      {isGenerating && <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />}
      <span className="text-slate-600 dark:text-slate-400">
        {label}: {displayTime}
      </span>
    </div>
  );
}
