
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const location = useLocation();
  const { t } = useTranslation();
  
  const routes = [
    { href: '/', label: 'nav.home' as const },
    { href: '/floating-market', label: 'Chợ nổi trên biển' },
    { href: '/marketing-procurement', label: 'Tiếp thị thu mua' },
    { href: '/shipping-handler', label: 'Chành nhận tải' },
    { href: '/shipping-needs', label: 'Nhu cầu chuyển tải' },
    { href: '/starlink', label: 'nav.starlink' as const },
    { href: '/traceability', label: 'nav.traceability' as const },
    { href: '/fleet-management', label: 'nav.fleet_management' as const },
    { href: '/marketplace', label: 'nav.marketplace' as const },
    { href: '/about', label: 'nav.about' as const },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          to={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            location.pathname === route.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {route.label.startsWith('nav.') ? t(route.label as any) : route.label}
        </Link>
      ))}
    </nav>
  );
}
