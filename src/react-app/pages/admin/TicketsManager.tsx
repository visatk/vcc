import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface Ticket {
  id: number;
  userId: number;
  subject: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: number;
  updatedAt: number;
  user?: { name: string; email: string };
}

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  message: string;
  createdAt: number;
  sender?: { name: string; role: string };
}

export default function TicketsManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<(Ticket & { messages: TicketMessage[] }) | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await api.get<Ticket[]>('/tickets');
      setTickets(data);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: number) => {
    try {
      const data = await api.get<Ticket & { messages: TicketMessage[] }>(`/tickets/${id}`);
      setTicketDetails(data);
      setSelectedTicketId(id);
    } catch (err) {
      toast.error('Failed to load ticket details');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;

    try {
      await api.post(`/tickets/${selectedTicketId}/messages`, { message: replyMessage });
      toast.success('Reply sent');
      setReplyMessage('');
      fetchTicketDetails(selectedTicketId);
      fetchTickets(); // Refresh list to update status/timestamps
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/tickets/${id}/status`, { status });
      toast.success(`Ticket marked as ${status}`);
      fetchTickets();
      if (selectedTicketId === id) fetchTicketDetails(id);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-base-content/60 mt-1">Manage customer inquiries and issues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 border border-base-200 bg-base-100 rounded-xl flex flex-col overflow-hidden max-h-[800px]">
          <div className="p-4 border-b border-base-200 font-semibold bg-base-200/30">All Tickets</div>
          <div className="overflow-y-auto flex-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">No tickets found.</div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => fetchTicketDetails(ticket.id)}
                  className={`p-4 border-b border-base-200 cursor-pointer transition-colors hover:bg-base-200/50 ${selectedTicketId === ticket.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium truncate pr-2">{ticket.subject}</span>
                    <span className={`badge badge-sm ${ticket.status === 'open' ? 'badge-error' : ticket.status === 'resolved' ? 'badge-success' : ''}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-xs text-base-content/60 flex justify-between">
                    <span>{ticket.user?.name}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2 border border-base-200 bg-base-100 rounded-xl flex flex-col overflow-hidden h-[800px]">
          {ticketDetails ? (
            <>
              <div className="p-6 border-b border-base-200 bg-base-200/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{ticketDetails.subject}</h3>
                    <p className="text-sm text-base-content/70 mt-1">
                      From: {ticketDetails.user?.name} ({ticketDetails.user?.email}) &bull; Opened {new Date(ticketDetails.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ticketDetails.status !== 'resolved' && (
                      <button onClick={() => updateStatus(ticketDetails.id, 'resolved')} className="btn btn-sm btn-success btn-outline">Mark Resolved</button>
                    )}
                    {ticketDetails.status !== 'closed' && (
                      <button onClick={() => updateStatus(ticketDetails.id, 'closed')} className="btn btn-sm btn-ghost">Close</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-base-200/10 flex flex-col-reverse">
                {ticketDetails.messages.map(msg => (
                  <div key={msg.id} className={`chat ${msg.sender?.role === 'admin' ? 'chat-end' : 'chat-start'}`}>
                    <div className="chat-header mb-1">
                      {msg.sender?.name}
                      <time className="text-xs opacity-50 ml-2">{new Date(msg.createdAt).toLocaleString()}</time>
                    </div>
                    <div className={`chat-bubble ${msg.sender?.role === 'admin' ? 'chat-bubble-primary' : 'chat-bubble-base-200'}`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-base-200 bg-base-100">
                <form onSubmit={handleReply} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your reply..." 
                    className="input input-bordered flex-1"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!replyMessage.trim()}>Reply</button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-base-content/40 p-8">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50 stroke-current" strokeWidth={1} />
              <p className="text-lg font-medium">Select a ticket to view conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
