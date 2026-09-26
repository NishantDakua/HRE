import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  verified?: boolean;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, verified, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {verified && <span className="badge bg-emerald-50 text-emerald-700">Verified Business</span>}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
