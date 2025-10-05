'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Building2, Users, BookOpen, BarChart3, Settings, Activity, ChevronRight } from 'lucide-react';

interface SitemapNode {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: SitemapNode[];
}

export default function SitemapPage() {
  useEffect(() => {
    document.title = 'Pulseboard | Sitemap';
  }, []);
  const sitemap: SitemapNode[] = [
    {
      title: 'Home',
      href: '/',
      icon: <Home className="w-4 h-4" />,
    },
    {
      title: 'Companies',
      href: '/companies',
      icon: <Building2 className="w-4 h-4" />,
      children: [
        {
          title: 'New Company',
          href: '/companies/new',
          icon: <ChevronRight className="w-3 h-3" />,
        },
      ],
    },
    {
      title: 'Team Members',
      href: '/members',
      icon: <Users className="w-4 h-4" />,
      children: [
        {
          title: 'New Member',
          href: '/members/new',
          icon: <ChevronRight className="w-3 h-3" />,
        },
      ],
    },
    {
      title: 'Manager Dashboard',
      href: '/manager',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      title: 'System Status',
      href: '/status',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'Sitemap',
      href: '/sitemap',
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  const renderNode = (node: SitemapNode, level: number = 0) => {
    const paddingLeft = level * 24;

    return (
      <div key={node.href}>
        <Link
          href={node.href}
          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {node.icon}
          </span>
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {node.title}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              {node.href}
            </p>
          </div>
        </Link>
        {node.children && (
          <div className="mt-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8 text-slate-700 dark:text-slate-300" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Sitemap
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              A complete overview of all pages and features in Pulseboard
            </p>

            <div className="space-y-2">
              {sitemap.map((node) => renderNode(node))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              href="/companies"
              className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 hover:underline"
            >
              <Building2 className="w-4 h-4" />
              Manage Companies
            </Link>
            <Link
              href="/members"
              className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 hover:underline"
            >
              <Users className="w-4 h-4" />
              Team Members
            </Link>
            <Link
              href="/manager"
              className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 hover:underline"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 hover:underline"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link
              href="/status"
              className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 hover:underline"
            >
              <Activity className="w-4 h-4" />
              System Status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
