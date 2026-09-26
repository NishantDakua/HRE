import { useState } from 'react';
import { Send } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

interface Conversation {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread: number;
}

interface Bubble {
  fromMe: boolean;
  text: string;
  time: string;
}

const conversations: Conversation[] = [
  { id: 'c1', name: 'Metro Hospitality', initials: 'MH', preview: 'We can offer 225 chairs at ₹145 each.', time: '10:24 AM', unread: 2 },
  { id: 'c2', name: 'Royal Caterers', initials: 'RC', preview: 'Confirmed — 300 plates for Oct 2 event.', time: '9:02 AM', unread: 0 },
  { id: 'c3', name: 'Urban Banquets', initials: 'UB', preview: 'Ballroom is available on your dates.', time: 'Yesterday', unread: 0 },
  { id: 'c4', name: 'Grand Events', initials: 'GE', preview: 'Sent revised quote for stage rental.', time: '2 days ago', unread: 1 },
  { id: 'c5', name: 'Elite Services', initials: 'ES', preview: 'Staffing team assigned for the weekend.', time: '4 days ago', unread: 0 },
];

const thread: Bubble[] = [
  { fromMe: false, text: 'Hi, we saw your requirement REQ-1042 for 500 banquet chairs.', time: '10:02 AM' },
  { fromMe: false, text: 'We can supply 225 units from our Mumbai warehouse.', time: '10:03 AM' },
  { fromMe: true, text: 'Sounds good. What price per chair are you offering?', time: '10:10 AM' },
  { fromMe: false, text: 'We can offer 225 chairs at ₹145 each, delivered by Oct 3.', time: '10:24 AM' },
];

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];

  return (
    <div>
      <PageHeader title="Messages" subtitle="Conversations with providers across your requirements" />

      <div className="card flex h-[calc(100vh-220px)] overflow-hidden">
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-100">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-start gap-3 border-b border-slate-50 p-4 text-left transition-colors ${
                c.id === selectedId ? 'bg-blue-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {c.initials}
              </span>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-slate-900">{c.name}</p>
                  <span className="whitespace-nowrap text-xs text-slate-400">{c.time}</span>
                </div>
                <p className="truncate text-sm text-slate-500">{c.preview}</p>
              </div>
              {c.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {selected.initials}
            </span>
            <p className="font-semibold text-slate-900">{selected.name}</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {thread.map((b, i) => (
              <div key={i} className={`flex ${b.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${b.fromMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <p>{b.text}</p>
                  <p className={`mt-1 text-[11px] ${b.fromMe ? 'text-blue-100' : 'text-slate-400'}`}>{b.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 p-4">
            <input type="text" placeholder="Type a message..." className="input-field" />
            <button className="btn-primary">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
