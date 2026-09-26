import { ShieldCheck, Network, Boxes, MessagesSquare, Truck } from 'lucide-react';

const items = [
  { icon: ShieldCheck, label: 'Verified Businesses' },
  { icon: Network, label: 'Smart Matching' },
  { icon: Boxes, label: 'Multi-Provider Fulfillment' },
  { icon: MessagesSquare, label: 'Direct Negotiation' },
  { icon: Truck, label: 'Coordinated Delivery' },
];

export default function TrustStrip() {
  return (
    <section className="border-b border-slate-100 bg-slate-50/80 py-6">
      <div className="container-wide flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-[13px] text-slate-600 xl:max-w-[250px]">Trusted by hospitality businesses that need resources to move.</p>
        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          {items.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-slate-700">
              <Icon size={18} className="text-blue-600" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
