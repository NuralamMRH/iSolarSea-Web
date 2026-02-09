
import { Anchor, Ship, Map, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  className?: string;
}

function ServiceCard({ icon, title, description, href, className }: ServiceCardProps) {
  return (
    <Link to={href} className={cn("service-card", className)}>
      <div className="service-card-icon">{icon}</div>
      <h3 className="service-card-title">{title}</h3>
      <p className="service-card-description">{description}</p>
    </Link>
  );
}

export function ServiceSection() {
  const { t } = useTranslation();
  
  return (
    <section className="bg-gray-50 py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 ocean-text-gradient">
            {t('services.title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('services.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <ServiceCard 
            icon={<Anchor />} 
            title={t('services.port_requirements.title')}
            description={t('services.port_requirements.description')}
            href="/port-request"
          />
          <ServiceCard 
            icon={<Database />}
            title={t('services.mining_log.title')}
            description={t('services.mining_log.description')}
            href="/mining-log"
          />
          <ServiceCard 
            icon={<Ship />}
            title={t('services.fleet_management.title')}
            description={t('services.fleet_management.description')}
            href="/fleet-management"
          />
          <ServiceCard 
            icon={<Map />}
            title={t('services.seafood_factory.title')}
            description={t('services.seafood_factory.description')}
            href="/seafood-factory"
          />
        </div>
      </div>
    </section>
  );
}
