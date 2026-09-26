import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { homeApi } from '../../services/api';
import HeroSection from '../../components/home/HeroSection';
import SearchPanel from '../../components/home/SearchPanel';
import TrustStrip from '../../components/home/TrustStrip';
import CategoryGrid from '../../components/home/CategoryGrid';
import MultiProviderSection from '../../components/home/MultiProviderSection';
import HowItWorksStrip from '../../components/home/HowItWorksStrip';
import FeaturedResources from '../../components/home/FeaturedResources';
import ProcurementPanel from '../../components/home/ProcurementPanel';
import CtaBanner from '../../components/home/CtaBanner';

export default function HomePage() {
  const [months, setMonths] = useState(6);
  const { data, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['home', months],
    queryFn: () => homeApi.get(months),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return (
    <div className="bg-white">
      <HeroSection categories={data?.categories} stats={data?.stats} />
      <SearchPanel categories={data?.categories} locations={data?.locations} />

      {isError && !data && (
        <div className="container-wide mt-6">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
            <span className="flex items-center gap-2">
              <AlertCircle size={16} /> Live marketplace data couldn't be loaded.
            </span>
            <button onClick={() => refetch()} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="mt-10">
        <TrustStrip />
      </div>
      <CategoryGrid categories={data?.categories} />
      <MultiProviderSection featured={data?.featured} />
      <HowItWorksStrip />

      <section className="container-wide grid gap-8 pb-14 pt-4 lg:grid-cols-2">
        <FeaturedResources featured={data?.featured} />
        <ProcurementPanel
          procurement={data?.procurement}
          months={months}
          onMonthsChange={setMonths}
          refreshing={isFetching && isPlaceholderData}
        />
      </section>

      <CtaBanner />
    </div>
  );
}
