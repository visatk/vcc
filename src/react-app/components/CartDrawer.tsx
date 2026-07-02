import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import ApiRonePaymentModal from './ApiRonePaymentModal';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, getTotal, clearCart } = useCartStore();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated());
  const navigate = useNavigate();
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discountType: 'percentage'|'fixed', discountValue: number} | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingFree, setIsProcessingFree] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const authUser = useAuthStore(state => state.user);

  const subtotal = getTotal();
  
  let discountUsd = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountUsd = subtotal * (appliedCoupon.discountValue / 100);
    } else {
      discountUsd = appliedCoupon.discountValue;
    }
  }
  let finalTotal = Math.max(0, subtotal - discountUsd);
  
  if (useBalance && authUser?.balanceUsd) {
    const deduct = Math.min(finalTotal, authUser.balanceUsd);
    finalTotal = Math.max(0, finalTotal - deduct);
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.post('/coupons/validate', { code: couponCode }) as any;
      if (res.success) {
        setAppliedCoupon(res.coupon);
        toast.success('Coupon applied!');
      } else {
        toast.error(res.message || 'Invalid coupon');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error validating coupon');
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to checkout.');
      onClose();
      navigate('/login');
      return;
    }

    if (items.length === 0) return;

    if (finalTotal === 0) {
      setIsProcessingFree(true);
      try {
        const res = await api.post('/orders/checkout', {
          items: items.map(i => ({ productId: i.productId, priceUsd: i.priceUsd })),
          couponCode: appliedCoupon?.code,
          amountUsd: 0,
          useBalance: useBalance
        }) as any;
        
        if (res.success) {
          toast.success("Success! Items are in your dashboard.");
          clearCart();
          onClose();
          navigate('/dashboard');
        } else {
          toast.error(res.message || "Checkout failed");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred during checkout");
      }
      setIsProcessingFree(false);
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  return (
  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog.Portal>
          <AnimatePresence>
            {isOpen && (
              <>
                <Dialog.Overlay asChild forceMount>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                  />
                </Dialog.Overlay>
                <Dialog.Content asChild forceMount>
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-full max-w-md bg-base-100 z-[101] shadow-2xl border-l border-white/10 flex flex-col outline-none"
                  >
                    <Dialog.Title className="sr-only">Your Cart</Dialog.Title>
                    <Dialog.Description className="sr-only">Review your items and proceed to checkout.</Dialog.Description>
                    <div className="p-6 flex items-center justify-between border-b border-white/10">
                      <h2 className="text-2xl font-bold">Your Cart</h2>
                      <Dialog.Close asChild>
                        <button className="btn btn-circle btn-sm btn-ghost"><X className="w-5 h-5" /></button>
                      </Dialog.Close>
                    </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 ? (
                  <div className="text-center opacity-50 py-12">
                    <p>Your cart is empty.</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.productId} className="flex gap-4 items-center bg-base-200/50 p-3 rounded-xl border border-white/5">
                      <img src={item.imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm leading-tight">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-sm badge-outline text-[10px] uppercase">{item.type}</span>
                          <span className="text-primary font-bold text-sm">
                            {item.pricingModel === 'free' ? 'FREE' : `$${item.priceUsd.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="btn btn-ghost btn-xs text-error">Remove</button>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-6 border-t border-white/10 bg-base-200/50 space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Coupon code" 
                      className="input input-sm input-bordered w-full font-mono uppercase" 
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <button onClick={handleApplyCoupon} className="btn btn-sm btn-secondary">Apply</button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm opacity-70">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-success font-medium">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-${discountUsd.toFixed(2)}</span>
                      </div>
                    )}
                    {authUser?.balanceUsd && authUser.balanceUsd > 0 ? (
                      <div className="flex items-center justify-between text-sm py-2">
                        <label className="cursor-pointer label p-0 gap-2">
                          <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={useBalance} onChange={(e) => setUseBalance(e.target.checked)} />
                          <span className="label-text">Use Store Credit (${authUser.balanceUsd.toFixed(2)})</span>
                        </label>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-primary">${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleCheckout} 
                    disabled={isProcessingFree}
                    className="btn btn-primary w-full shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
                  >
                    {isProcessingFree ? <span className="loading loading-spinner"></span> : 'Checkout'}
                  </button>
                </div>
              )}
            </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Portal>
      </Dialog.Root>

      <ApiRonePaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amountUsd={finalTotal.toString()}
        items={items}
        couponCode={appliedCoupon?.code}
        useBalance={useBalance}
        onSuccess={() => {
          clearCart();
          onClose();
          navigate('/dashboard');
        }}
      />
    </>
  );
}
