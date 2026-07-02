import { useEffect, useState } from "react";
import { useAuthStore, User } from "../store/authStore";
import { api } from "../utils/api";
import { motion } from "framer-motion";

interface Order {
  id: number;
  totalUsd: number;
  status: string;
  cryptoCurrency: string;
  cryptoAmount: string;
  createdAt: number;
  items: Array<{
    id: number;
    productId: number;
    priceUsd: number;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function UserDashboard() {
  const authUser = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const setAuth = useAuthStore(state => state.setAuth);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    // Fetch latest user profile
    api.get<User>("/auth/me")
      .then((data) => {
        if (token) setAuth(data, token);
      })
      .catch(console.error);

    api.get<Order[]>("/orders")
      .then((data) => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const submitReview = async () => {
    if (!reviewProductId) return;
    try {
      await api.post('/reviews', { productId: reviewProductId, rating: reviewRating, comment: reviewComment });
      setReviewModalOpen(false);
      setReviewProductId(null);
      setReviewComment("");
      // Success handled by toast in api wrapper ideally, but just in case:
      alert("Review submitted successfully! Pending approval.");
    } catch (e: any) {
      alert(e.message || "Failed to submit review");
    }
  };

  const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalUsd, 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 gpu-accelerated"
      >
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 leading-tight">Welcome back, <span className="text-primary">{authUser?.name || 'User'}</span></h1>
        <div className="flex justify-between items-center flex-wrap gap-4 mt-2">
          <p className="text-base-content/60 font-medium text-lg">Manage your premium downloads and orders here.</p>
          <a href="/support" className="btn btn-primary btn-outline btn-sm rounded-full font-bold">Support Tickets</a>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"
      >
        {/* Bento Box 1: Profile Info */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-box p-6 border border-white/5 relative overflow-hidden group contain-layout gpu-accelerated">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors gpu-accelerated"></div>
          <h3 className="text-base-content/70 font-semibold mb-4 uppercase text-xs tracking-[0.1em]">Account Identity</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-content shadow-lg">
              {authUser?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">{authUser?.name}</div>
              <div className="text-sm opacity-60 font-medium">{authUser?.email}</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-xs font-semibold opacity-70 mb-2 uppercase tracking-wide">Your Affiliate Link <span className="text-primary">(Earn 10%)</span></h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                className="input input-sm input-bordered flex-grow bg-base-100/50 text-xs font-mono rounded-full px-4 focus:outline-none" 
                value={`https://${window.location.hostname}/register?ref=${authUser?.affiliateCode || ''}`} 
              />
              <button 
                className="btn btn-sm btn-primary rounded-full px-4 shadow-sm"
                onClick={() => navigator.clipboard.writeText(`https://${window.location.hostname}/register?ref=${authUser?.affiliateCode || ''}`)}
              >
                Copy
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bento Box 2: Store Credit */}
        <motion.div variants={itemVariants} className="col-span-1 bg-base-200/50 backdrop-blur-md rounded-box p-6 border border-white/5 glow-effect contain-layout gpu-accelerated">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-base-content/70 font-semibold mb-2 uppercase text-xs tracking-[0.1em]">Store Credit</h3>
            <div className="text-4xl font-black text-success tracking-tighter">${(authUser?.balanceUsd || 0).toFixed(2)}</div>
            <p className="text-xs text-base-content/60 font-medium mt-4">Automatically applied at checkout</p>
          </div>
        </motion.div>

        {/* Bento Box 3: Total Spent */}
        <motion.div variants={itemVariants} className="col-span-1 bg-base-200/50 backdrop-blur-md rounded-box p-6 border border-white/5 glow-effect contain-layout gpu-accelerated">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-base-content/70 font-semibold mb-2 uppercase text-xs tracking-[0.1em]">Total Invested</h3>
            <div className="text-4xl font-black tracking-tighter">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-base-content/60 font-medium mt-4">Across {orders.filter(o => o.status === 'completed').length} orders</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-base-200/30 backdrop-blur-sm rounded-box p-6 md:p-8 border border-white/5 gpu-accelerated contain-layout"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Order History</h2>
          <button className="btn btn-sm btn-ghost rounded-full">Filter</button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner text-primary loading-lg"></span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 opacity-60 bg-base-100/30 rounded-xl">
            <p className="text-lg font-medium">You haven't placed any orders yet.</p>
            <button className="btn btn-primary btn-outline mt-4 rounded-full">Browse Store</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                key={order.id} 
                className="flex flex-col md:flex-row justify-between items-start md:items-center bg-base-100/50 p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-0 w-full md:w-auto">
                  <div>
                    <span className="text-xs uppercase font-semibold text-base-content/50 block">Order</span>
                    <span className="font-bold font-mono">#{order.id}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-base-content/50 block">Date</span>
                    <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-base-content/50 block">Total</span>
                    <span className="font-bold text-primary">${order.totalUsd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-base-content/50 block">Status</span>
                    <div className={`badge badge-sm mt-1 ${order.status === 'completed' ? 'badge-success' : order.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                      {order.status}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {order.status === 'completed' ? (
                    <div className="flex flex-col gap-2">
                      <button className="btn btn-primary rounded-full px-6 shadow-md glow-effect">
                        Access Downloads
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                           if (order.items && order.items.length > 0) {
                             setReviewProductId(order.items[0].productId);
                             setReviewModalOpen(true);
                           }
                        }}
                      >
                        Leave a Review
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs opacity-70 mb-1">Awaiting {order.cryptoAmount} {order.cryptoCurrency?.toUpperCase()}</div>
                      <button className="btn btn-outline btn-warning btn-sm rounded-full">View Invoice</button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Leave a Review</h3>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Rating (1-5)</span></label>
              <div className="rating">
                {[1,2,3,4,5].map(star => (
                  <input key={star} type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" checked={reviewRating === star} onChange={() => setReviewRating(star)} />
                ))}
              </div>
            </div>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Comment (optional)</span></label>
              <textarea className="textarea textarea-bordered h-24" placeholder="How was the product?" value={reviewComment} onChange={e => setReviewComment(e.target.value)}></textarea>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setReviewModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReview}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
