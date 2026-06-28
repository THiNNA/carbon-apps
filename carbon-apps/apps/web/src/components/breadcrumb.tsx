import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const isId = (val: string) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  const numRegex = /^\d+$/;
  return uuidRegex.test(val) || objectIdRegex.test(val) || numRegex.test(val);
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x && !isId(x));

  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/' }];

  let currentPath = '';
  pathnames.forEach((value, index) => {
    currentPath += `/${value}`;
    const label = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
    const isLast = index === pathnames.length - 1;
    
    breadcrumbs.push({
      label,
      path: isLast ? undefined : currentPath
    });
  });

  if (location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="flex mb-4 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <li key={idx} className="inline-flex items-center">
              {idx > 0 && <span className="mx-2 text-slate-300">/</span>}
              {isLast || !item.path ? (
                <span className="text-slate-800 font-semibold">{item.label}</span>
              ) : (
                <Link to={item.path} className="hover:text-emerald-600 transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
