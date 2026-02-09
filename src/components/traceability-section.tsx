
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export function TraceabilitySection() {
  const { t } = useTranslation();
  
  const features = [
    { key: 'feature_1', text: t('traceability.features.monitoring') },
    { key: 'feature_2', text: t('traceability.features.oil_monitoring') },
    { key: 'feature_3', text: t('traceability.features.financial_support') },
    { key: 'feature_4', text: t('traceability.features.ai_scan') },
    { key: 'feature_5', text: t('traceability.features.wifi_starlink') },
    { key: 'feature_6', text: t('traceability.features.online_auction') },
    { key: 'feature_7', text: t('traceability.features.marketplace') }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('traceability.title')}</h2>
          <h3 className="text-3xl md:text-4xl font-bold mb-6 ocean-text-gradient">
            {t('traceability.subtitle')}
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('traceability.description')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-10">
          <div className="rounded-lg overflow-hidden">
            <img 
              src="/images/fleet-management.jpg" 
              alt="Fleet Management" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-navy-800">{t('traceability.solution_title')}</h3>
            <p className="text-gray-600">{t('traceability.solution_description')}</p>
            
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
              {features.map((feature) => (
                <li key={feature.key} className="feature-item">
                  <Check size={16} className="text-sea-500" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            
            <Link to="/fleet-management">
              <Button className="btn-ocean">
                {t('traceability.manage_fleet')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
