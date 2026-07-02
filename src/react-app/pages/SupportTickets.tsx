import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface Ticket {
  id: number;
  subject: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: number;
  updatedAt: number;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  message: string;
  createdAt: number;
  sender?: { name: string; role: string };
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<(Ticket & { messages: TicketMessage[] }) | null>(null);
  
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
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
      setIsNewTicketOpen(false);
    } catch (err) {
      toast.error('Failed to load ticket details');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    try {
      await api.post('/tickets', { subject: newSubject, message: newMessage });
      toast.success('Ticket opened successfully');
      setNewSubject('');
      setNewMessage('');
      setIsNewTicketOpen(false);
      fetchTickets();
    } catch (err) {
      toast.error('Failed to open ticket');
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
      fetchTickets();
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-base-content/60 mt-1">Need help? Open a ticket below.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsNewTicketOpen(true); setSelectedTicketId(null); setTicketDetails(null); }}>
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 border border-base-200 bg-base-100 rounded-xl flex flex-col overflow-hidden h-[600px]">
          <div className="p-4 border-b border-base-200 font-semibold bg-base-200/30">Your Tickets</div>
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
                    <span className={`badge badge-sm ${ticket.status === 'open' ? 'badge-warning' : ticket.status === 'resolved' ? 'badge-success' : ''}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-xs text-base-content/60 flex justify-between">
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail/New Ticket Area */}
        <div className="lg:col-span-2 border border-base-200 bg-base-100 rounded-xl flex flex-col overflow-hidden h-[600px]">
          {isNewTicketOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col">
              <h3 className="text-2xl font-bold mb-6">Open a New Ticket</h3>
              <form onSubmit={handleCreateTicket} className="flex-1 flex flex-col space-y-4">
                <div className="form-control w-full">
                  <label className="label"><span className="label-text">Subject</span></label>
                  <input type="text" className="input input-bordered w-full" value={newSubject} onChange={e => setNewSubject(e.target.value)} required />
                </div>
                <div className="form-control w-full flex-1 flex flex-col">
                  <label className="label"><span className="label-text">Message</span></label>
                  <textarea className="textarea textarea-bordered w-full flex-1 resize-none" value={newMessage} onChange={e => setNewMessage(e.target.value)} required></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsNewTicketOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Ticket</button>
                </div>
              </form>
            </motion.div>
          ) : ticketDetails ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
              <div className="p-6 border-b border-base-200 bg-base-200/20">
                <h3 className="text-xl font-bold">{ticketDetails.subject}</h3>
                <p className="text-sm text-base-content/70 mt-1">Status: {ticketDetails.status.toUpperCase()}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-base-200/10 flex flex-col-reverse">
                {ticketDetails.messages.map(msg => (
                  <div key={msg.id} className={`chat ${msg.sender?.role === 'admin' ? 'chat-start' : 'chat-end'}`}>
                    <div className="chat-header mb-1">
                      {msg.sender?.role === 'admin' ? 'Support Agent' : 'You'}
                      <time className="text-xs opacity-50 ml-2">{new Date(msg.createdAt).toLocaleString()}</time>
                    </div>
                    <div className={`chat-bubble ${msg.sender?.role === 'admin' ? 'chat-bubble-primary' : 'chat-bubble-base-200 text-base-content'}`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              {ticketDetails.status !== 'closed' && (
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
              )}
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-base-content/40 p-8">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50 stroke-current" strokeWidth={1} />
              <p className="text-lg font-medium">Select a ticket or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
