import { CheckCircle2, Circle } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type Stage = 'Booked' | 'Preparing' | 'In Transit' | 'Delivered';

const stages: Stage[] = ['Booked', 'Preparing', 'In Transit', 'Delivered'];

interface ActiveOrder {
  id: string;
  buyer: string;
  resource: string;
  quantity: number;
  unit: string;
  currentStage: Stage;
  eta: string;
}

const orders: ActiveOrder[] = [
  { id: 'BKG-3021', buyer: 'Hotel Sunrise', resource: 'Premium Banquet Chairs', quantity: 500, unit: 'chairs', currentStage: 'Preparing', eta: 'Oct 3, 2026' },
  { id: 'BKG-3019', buyer: 'The Grand Palm', resource: 'Round Banquet Tables', quantity: 80, unit: 'tables', currentStage: 'In Transit', eta: 'Oct 5, 2026' },
  { id: 'BKG-2998', buyer: 'Lakeside Convention Centre', resource: 'LED Stage Lighting Rig', quantity: 2, unit: 'rigs', currentStage: 'In Transit', eta: 'Oct 13, 2026' },
  { id: 'BKG-3015', buyer: 'Coastal Retreat Resort', resource: 'Cocktail Lounge Furniture', quantity: 6, unit: 'sets', currentStage: 'Delivered', eta: 'Delivered Sep 24, 2026' },
];

function StepTracker({ current }: { current: Stage }) {
  const currentIndex = stages.indexOf(current);
  return (
    <div className="flex items-center">
      {stages.map((stage, i) => {
        const done = i <= currentIndex;
        return (
          <div key={stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              {done ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : (
                <Circle size={20} className="text-slate-300" />
              )}
              <span className={`text-xs font-medium ${done ? 'text-slate-700' : 'text-slate-400'}`}>{stage}</span>
            </div>
            {i < stages.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${i < currentIndex ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProviderFulfillmentPage() {
  return (
    <div>
      <PageHeader title="Fulfillment" subtitle="Track active deliveries in progress" />

      <div className="space-y-5">
        {orders.map((o) => (
          <div key={o.id} className="card p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{o.buyer}</p>
                <p className="text-xs text-slate-400">{o.id} &middot; {o.resource} &middot; {o.quantity} {o.unit}</p>
              </div>
              <span className="text-sm font-medium text-slate-500">{o.eta}</span>
            </div>
            <StepTracker current={o.currentStage} />
          </div>
        ))}
      </div>
    </div>
  );
}
