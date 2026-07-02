import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

declare global {
  interface Window {
    zaraz?: {
      ecommerce: (eventName: string, params: any) => void;
    };
  }
}

interface ApiRonePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountUsd: string;
  items: Array<{productId: number, priceUsd: number}>;
  couponCode?: string;
  useBalance?: boolean;
  onSuccess?: () => void;
}

export default function ApiRonePaymentModal({ isOpen, onClose, amountUsd, items, couponCode, useBalance, onSuccess }: ApiRonePaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<'btc' | 'ltc' | 'bch' | 'doge' | 'trx'>('btc');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setOrder(null);
      setError(null);
      if (pollInterval.current) clearInterval(pollInterval.current);
      return;
    }

    // Initiate checkout
    const initCheckout = async () => {
      try {
        const res = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            couponCode,
            amountUsd: parseFloat(amountUsd),
            currency: selectedCrypto,
            useBalance
          })
        });
        
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
          startPolling(data.data.orderId);
          
          // Zaraz E-commerce Tracking: Checkout Started
          if (window.zaraz) {
            window.zaraz.ecommerce("Checkout Started", {
              checkout_id: data.data.orderId.toString(),
              currency: "USD",
              value: parseFloat(amountUsd),
              step: 1
            });
          }
        } else {
          setError(data.message || 'Checkout failed');
        }
      } catch (err) {
        setError('Failed to connect to API');
      } finally {
        setLoading(false);
      }
    };

    initCheckout();

    return () => {
      if (pollInterval.current) {
        if (typeof pollInterval.current === 'object' && 'close' in pollInterval.current) {
          (pollInterval.current as any).close();
        } else {
          clearInterval(pollInterval.current as any);
        }
      }
    };
  }, [isOpen, amountUsd]);

  const startPolling = (orderId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/orders/ws/${orderId}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'completed') {
          setOrder(data);
          ws.close();
          
          // Zaraz E-commerce Tracking: Order Completed
          if (window.zaraz) {
            window.zaraz.ecommerce("Order Completed", {
              checkout_id: data.id.toString(),
              order_id: data.id.toString(),
              total: data.totalUsd,
              currency: "USD",
              payment_type: data.cryptoCurrency
            });
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      // Fallback to single fetch if WS fails
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => { if(data.status === 'completed') setOrder(data); })
        .catch(() => {});
    };

    // Store a reference to close it if the component unmounts
    pollInterval.current = ws as any;
  };

  const copyToClipboard = () => {
    if (order?.depositAddress) {
      navigator.clipboard.writeText(order.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 backdrop-blur-sm bg-base-300/60 z-[200]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201] outline-none modal-box shadow-2xl border border-base-200 bg-base-100"
          aria-labelledby="payment-modal-title"
        >
          <Dialog.Close asChild>
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 hover:bg-base-200 hover:text-error transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
          <Dialog.Title id="payment-modal-title" className="font-bold text-xl mb-6 text-center">ApiRone Crypto Checkout</Dialog.Title>
          <Dialog.Description className="sr-only">Complete your crypto payment via ApiRone.</Dialog.Description>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm opacity-70 animate-pulse">Generating crypto address...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : order?.status === 'completed' ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-success">
            <CheckCircle className="h-20 w-20" />
            <h4 className="text-2xl font-bold">Payment Received!</h4>
            <p className="text-base-content/70">Thank you for your purchase.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {!order?.depositAddress && (
              <div className="w-full flex justify-center gap-2 mb-2 flex-wrap">
                {['btc', 'ltc', 'bch', 'doge', 'trx'].map((c) => (
                  <button 
                    key={c}
                    onClick={() => setSelectedCrypto(c as any)} 
                    className={`btn btn-sm ${selectedCrypto === c ? 'btn-primary' : 'btn-ghost border-base-300'}`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            
            <div className="p-5 bg-base-200/50 rounded-2xl text-center w-full shadow-inner border border-base-300">
              <p className="text-sm font-medium opacity-70 mb-1">Amount to send</p>
              <p className="text-3xl font-mono font-bold text-primary tracking-tight">
                {order?.cryptoAmount} <span className="uppercase text-xl">{order?.currency}</span>
              </p>
              <p className="text-sm opacity-60 mt-1">(${amountUsd} USD)</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-base-300 shadow-sm relative group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
              {order?.depositAddress && (
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:${order.depositAddress}?amount=${order.cryptoAmount}`} 
                  alt="QR Code" 
                  className="w-48 h-48 rounded-lg relative z-10"
                />
              )}
            </div>

            <div className="w-full form-control">
              <label className="label">
                <span className="label-text font-medium text-base-content/80">Send exact amount to this address:</span>
              </label>
              <div className="join w-full shadow-sm">
                <input 
                  type="text" 
                  value={order?.depositAddress || ''} 
                  readOnly 
                  className="input input-bordered join-item w-full font-mono text-xs md:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow cursor-copy" 
                  onClick={copyToClipboard}
                  aria-label="Wallet address"
                />
                <button 
                  onClick={copyToClipboard}
                  className={`btn join-item transition-all ${copied ? 'btn-success text-success-content' : 'btn-primary hover:brightness-110 active:scale-95'}`}
                  aria-label="Copy address"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="alert alert-warning shadow-sm mt-2 border-warning/30 bg-warning/10 animate-pulse">
              <AlertTriangle className="stroke-current shrink-0 h-6 w-6 text-warning" />
              <span className="font-medium text-warning-content">Awaiting payment confirmation...</span>
              <span className="loading loading-spinner loading-sm text-warning ml-auto"></span>
            </div>

          </div>
        )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
