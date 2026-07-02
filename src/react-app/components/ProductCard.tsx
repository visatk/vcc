import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  title: string;
  description: string;
  priceUsd: number;
  type: 'file' | 'serial' | 'subscription' | 'service' | 'product';
  pricingModel: 'one-time' | 'free' | 'pay-what-you-want';
  minPriceUsd?: number | null;
  billingInterval?: 'monthly' | 'yearly' | null;
  imageUrl: string;
  averageRating?: number;
  reviewCount?: number;
  onAddToCart?: (price: number) => void;
}

const ProductCard = memo(({ 
  title, 
  description, 
  priceUsd, 
  type, 
  pricingModel, 
  minPriceUsd, 
  billingInterval, 
  imageUrl, 
  averageRating,
  reviewCount,
  onAddToCart 
}: ProductCardProps) => {
  const [customPrice, setCustomPrice] = useState<string>(minPriceUsd ? minPriceUsd.toString() : "0");

  const handleAddToCart = () => {
    if (onAddToCart) {
      if (pricingModel === 'pay-what-you-want') {
        const val = parseFloat(customPrice);
        if (isNaN(val) || val < (minPriceUsd || 0)) {
          alert(`Minimum price is $${minPriceUsd || 0}`);
          return;
        }
        onAddToCart(val);
      } else if (pricingModel === 'free') {
        onAddToCart(0);
      } else {
        onAddToCart(priceUsd);
      }
    }
  };

  const displayPrice = () => {
    if (pricingModel === 'free') return 'FREE';
    if (pricingModel === 'pay-what-you-want') return `$${minPriceUsd?.toFixed(2)}+`;
    if (pricingModel === 'one-time') return `$${priceUsd.toFixed(2)}`;
    return `$${priceUsd.toFixed(2)}`;
  };

  return (
    <motion.article 
      whileHover={{ y: -5, scale: 1.01 }}
      className="card w-full max-w-sm bg-base-200/50 backdrop-blur-md shadow-xl border border-white/5 hover:border-primary/50 transition-all duration-300 group overflow-hidden glow-effect flex flex-col h-full contain-layout gpu-accelerated"
    >
      <figure className="h-56 overflow-hidden relative bg-black/20 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-base-200/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"></div>
        <motion.img 
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          src={imageUrl} 
          alt={`Image of ${title}`} 
          loading="lazy"
          decoding="async"
          className="object-cover w-full h-full gpu-accelerated" 
        />
        <div className="absolute top-3 right-3 z-20 flex gap-2 flex-col items-end">
          <div className="badge badge-primary badge-sm glass-panel font-bold shadow-lg uppercase">{type}</div>
          {pricingModel === 'free' && (
            <div className="badge badge-success badge-sm glass-panel font-bold shadow-lg">FREE</div>
          )}
        </div>
      </figure>
      <div className="card-body p-6 relative z-20 bg-gradient-to-b from-transparent to-base-200/80 flex flex-col flex-grow">
        <h3 className="card-title text-xl font-bold tracking-tight text-base-content leading-tight">
          {title}
        </h3>
        {reviewCount !== undefined && reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="rating rating-xs">
              {[1, 2, 3, 4, 5].map((star) => (
                <input 
                  key={star} 
                  type="radio" 
                  className={`mask mask-star-2 ${star <= Math.round(averageRating || 0) ? 'bg-orange-400' : 'bg-base-300'}`} 
                  disabled 
                  checked={star === Math.round(averageRating || 0)}
                />
              ))}
            </div>
            <span className="text-xs font-semibold opacity-70 ml-1">{averageRating?.toFixed(1)} ({reviewCount})</span>
          </div>
        )}
        <p className="text-sm text-base-content/60 line-clamp-3 mt-2 leading-relaxed flex-grow">{description}</p>
        
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {displayPrice()}
            </span>
            {billingInterval && (
              <span className="text-sm font-semibold opacity-70 ml-1">/{billingInterval}</span>
            )}
          </div>
          
          {pricingModel === 'pay-what-you-want' ? (
            <div className="flex gap-2 items-center">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 font-bold">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  min={minPriceUsd || 0}
                  className="input input-sm input-bordered w-full pl-7 rounded-full bg-base-100/50 focus:bg-base-100" 
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Name your price"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart} 
                className="btn btn-primary btn-sm rounded-full px-6 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] border-none"
              >
                Add to Cart
              </motion.button>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart} 
              className={`btn ${pricingModel === 'free' ? 'btn-success' : 'btn-primary'} w-full rounded-full shadow-[0_0_20px_rgba(var(--color-primary),0.3)] border-none font-bold tracking-wide gpu-accelerated`}
            >
              {pricingModel === 'free' ? 'Add Free to Cart' : 'Add to Cart'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
