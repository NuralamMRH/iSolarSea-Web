
import { ArrowRight, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export function MarketplaceSection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-2 uppercase text-gray-300">{t('marketplace.subtitle')}</h2>
          <h3 className="text-4xl font-bold mb-6 text-navy-900">{t('marketplace.title')}</h3>
        </div>
        
        <div className="mb-16">
          <img 
            src="/images/isolarfish-platform.png" 
            alt="iSolarFish Platform" 
            className="w-full max-w-2xl mx-auto"
          />
        </div>
        
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h3 className="text-2xl font-bold">{t('marketplace.solution_title')}</h3>
          <p className="text-gray-600">{t('marketplace.solution_description')}</p>
          
          <div className="mt-10">
            <Link to="/marketplace">
              <Button className="btn-ocean">
                <DollarSign size={16} />
                {t('marketplace.access_market')}
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
