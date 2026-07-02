import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import { api } from "../utils/api";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { toast } from "sonner";
import ProductCardSkeleton from "../components/ProductCardSkeleton";

interface Product {
  id: number;
  title: string;
  description: string;
  priceUsd: number;
  type: 'file' | 'serial' | 'subscription' | 'service' | 'product';
  pricingModel: 'one-time' | 'free' | 'pay-what-you-want';
  minPriceUsd?: number | null;
  billingInterval?: 'monthly' | 'yearly' | null;
  imageUrl: string;
  productCategories?: { categoryId: number, category: { id: number, name: string, slug: string } }[];
  averageRating?: number;
  reviewCount?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function StoreFront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addItem = useCartStore(state => state.addItem);
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated());
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Product[]>("/products"),
      api.get<Category[]>("/categories")
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load store data", err);
        setError("Could not load store data. Please try again later.");
        setIsLoading(false);
      });
  }, []);

  const filteredProducts = selectedCategoryId 
    ? products.filter(p => p.productCategories?.some(c => c.categoryId === selectedCategoryId))
    : products;

  const handleAddToCart = useCallback((product: Product, finalPrice: number) => {
    addItem({
      productId: product.id,
      title: product.title,
      priceUsd: finalPrice,
      pricingModel: product.pricingModel,
      imageUrl: product.imageUrl || "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp",
      type: product.type
    });
    toast.success(`${product.title} added to cart`);
  }, [addItem]);

  return (
    <>
      <div className="-mt-24">
        <Hero />
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="gpu-accelerated"
          >
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">Our Catalog</h2>
            <p className="opacity-60 mt-4 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
              Equip yourself with industry-leading scripts and applications tailored to skyrocket your productivity.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex gap-3 overflow-x-auto mt-8 md:mt-0 pb-2 scrollbar-hide max-w-full gpu-accelerated"
          >
            <button 
              onClick={() => setSelectedCategoryId(null)} 
              className={`btn btn-sm md:btn-md rounded-full font-bold tracking-wide transition-all ${selectedCategoryId === null ? 'btn-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'btn-ghost border border-white/10 hover:bg-white/5'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)} 
                className={`btn btn-sm md:btn-md rounded-full whitespace-nowrap font-bold tracking-wide transition-all ${selectedCategoryId === cat.id ? 'btn-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'btn-ghost border border-white/10 hover:bg-white/5'}`}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center md:justify-items-start">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-full flex justify-center">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-32">
            <div className="alert alert-error max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          </div>
        ) : (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            aria-label="Products list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center md:justify-items-start"
          >
            {filteredProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants} className="w-full flex justify-center">
                <ProductCard 
                  title={product.title}
                  description={product.description || ""}
                  priceUsd={product.priceUsd}
                  type={product.type}
                  pricingModel={product.pricingModel}
                  minPriceUsd={product.minPriceUsd}
                  billingInterval={product.billingInterval}
                  imageUrl={product.imageUrl || "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"}
                  averageRating={product.averageRating}
                  reviewCount={product.reviewCount}
                  onAddToCart={(finalPrice) => handleAddToCart(product, finalPrice)}
                />
              </motion.div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-20 opacity-50 font-light text-xl">
                No products found in this category.
              </div>
            )}
          </motion.section>
        )}
      </main>
      <div className="defer-render">
        <Footer />
      </div>
    </>
  );
}
