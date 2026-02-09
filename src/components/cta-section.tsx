
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export function CTASection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-sea-500 text-white">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-sea-50 mb-8">
            {t('cta.description')}
          </p>
          <Link to="/register">
            <Button className="bg-white text-sea-700 hover:bg-sea-100">
              {t('cta.register_now')}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
