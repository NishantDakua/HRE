import { MessageSquare, CalendarCheck, Wallet, Bell, type LucideIcon } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type NotificationType = 'offer' | 'booking' | 'payment' | 'system';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

const typeMeta: Record<NotificationType, { icon: LucideIcon; chip: string }> = {
  offer: { icon: MessageSquare, chip: 'bg-amber-50 text-amber-600' },
  booking: { icon: CalendarCheck, chip: 'bg-emerald-50 text-emerald-600' },
  payment: { icon: Wallet, chip: 'bg-violet-50 text-violet-600' },
  system: { icon: Bell, chip: 'bg-blue-50 text-blue-600' },
};

const today: NotificationItem[] = [
  { id: 'n1', type: 'offer', title: 'New counter-offer from Metro Hospitality', description: 'Countered your requirement REQ-1042 at ₹145/chair for 225 units.', time: '10:24 AM', unread: true },
  { id: 'n2', type: 'booking', title: 'Booking confirmed with Royal Caterers', description: 'BKG-3021 for buffet catering is now confirmed for 300 plates.', time: '9:02 AM', unread: true },
  { id: 'n3', type: 'payment', title: 'Payment released to Urban Banquets', description: '₹75,000 released from escrow for BKG-3019.', time: '8:47 AM', unread: true },
  { id: 'n4', type: 'system', title: 'Business verification refreshed', description: 'Hotel Sunrise verification status re-confirmed by EntityLocker.', time: '7:15 AM', unread: false },
];

const earlier: NotificationItem[] = [
  { id: 'n5', type: 'offer', title: 'Grand Events accepted your offer', description: 'Offer on Portable Stage Kit rental accepted at ₹18,000/event.', time: 'Yesterday', unread: false },
  { id: 'n6', type: 'booking', title: 'Fulfillment update: In Transit', description: 'Banquet tables for BKG-3015 are now in transit to your venue.', time: 'Yesterday', unread: false },
  { id: 'n7', type: 'payment', title: 'Payment pending approval', description: '₹24,000 payment for BKG-2998 is awaiting your approval.', time: '2 days ago', unread: false },
  { id: 'n8', type: 'system', title: 'New provider joined your category', description: 'Elite Services now offers manpower staffing in Mumbai.', time: '3 days ago', unread: false },
  { id: 'n9', type: 'offer', title: 'Negotiation closing soon', description: 'Your negotiation with Metro Hospitality expires in 24 hours.', time: '4 days ago', unread: false },
  { id: 'n10', type: 'system', title: 'Weekly procurement summary ready', description: 'Your analytics dashboard has been updated with this week’s spend.', time: '5 days ago', unread: false },
];

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  return (
    <div className={`flex items-start gap-4 rounded-xl p-4 ${item.unread ? 'bg-blue-50/50' : ''}`}>
      <span className={`icon-chip h-10 w-10 flex-shrink-0 ${meta.chip}`}>
        <Icon size={18} />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {item.unread && <span className="h-2 w-2 rounded-full bg-blue-600" />}
          <p className="font-medium text-slate-900">{item.title}</p>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
      </div>
      <span className="whitespace-nowrap text-xs text-slate-400">{item.time}</span>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Stay on top of offers, bookings, and payments" />

      <div className="card p-2 mb-6">
        <p className="section-label px-4 pt-3 pb-1">Today</p>
        <div className="divide-y divide-slate-50">
          {today.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="card p-2">
        <p className="section-label px-4 pt-3 pb-1">Earlier</p>
        <div className="divide-y divide-slate-50">
          {earlier.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
