'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ChevronRight, Circle, AlertCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type SystemStatus = 'operational' | 'degraded' | 'down' | 'checking';

export function Header() {
  const pathname = usePathname();
  const [status, setStatus] = useState<SystemStatus>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data.overall);
        } else {
          setStatus('down');
        }
      } catch (error) {
        setStatus('down');
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // Skip IDs in breadcrumbs
      if (path === 'new' || /^[0-9a-f-]{36}$/i.test(path)) {
        if (path === 'new') {
          breadcrumbs.push({
            label: 'New',
            href: currentPath
          });
        } else {
          breadcrumbs.push({
            label: 'Edit',
            href: currentPath
          });
        }
        return;
      }

      // Capitalize and format path
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getStatusDisplay = () => {
    switch (status) {
      case 'operational':
        return {
          icon: <Circle className="w-3 h-3 fill-green-500 text-green-500" />,
          text: 'Operational',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'degraded':
        return {
          icon: <AlertCircle className="w-3 h-3 text-yellow-500" />,
          text: 'Degraded',
          color: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'down':
        return {
          icon: <XCircle className="w-3 h-3 text-red-500" />,
          text: 'Down',
          color: 'text-red-600 dark:text-red-400',
        };
      case 'checking':
        return {
          icon: <Circle className="w-3 h-3 fill-slate-400 text-slate-400 animate-pulse" />,
          text: 'Checking',
          color: 'text-slate-600 dark:text-slate-400',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  if (pathname === '/') return null; // No breadcrumbs on home page

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-slate-900 dark:text-white font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    {index === 0 && <Home className="w-4 h-4" />}
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <Link
            href="/status"
            className={`flex items-center gap-2 text-sm ${statusDisplay.color} hover:opacity-75 transition-opacity`}
            title="View system status"
          >
            {statusDisplay.icon}
            <span className="font-medium">{statusDisplay.text}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
