import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Search, ShoppingCart, Menu, UserCircle } from 'lucide-react';
import CartDrawer from './CartDrawer';
import CommandPalette from './CommandPalette';

export default function Navbar() {
  const { user, isAuthenticated, logout, isAdmin } = useAuthStore(state => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated(),
    logout: state.logout,
    isAdmin: state.isAdmin(),
  }));
  const cartItemsCount = useCartStore(state => state.items.length);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 gpu-accelerated ${
        isScrolled ? 'py-3' : 'py-5'
      }`}
      style={{ willChange: "transform, padding" }}
    >
      <div className={`mx-auto transition-all duration-500 ${isScrolled ? 'max-w-4xl px-4' : 'max-w-7xl px-4 md:px-8'}`}>
        <div className={`navbar rounded-full transition-all duration-500 ${
          isScrolled 
            ? 'bg-base-200/60 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]' 
            : 'bg-transparent'
        }`}>
          <div className="flex-1 px-4">
            <Link to="/" className="text-xl md:text-2xl font-black tracking-tight hover:scale-105 transition-transform" aria-label="ScriptMarket Home">
              Script<span className="text-primary">Market</span>
            </Link>
          </div>
          <div className="flex-none gap-2 md:gap-4 px-2">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border border-white/10 hover:border-primary/50 text-sm opacity-80 hover:opacity-100 ${isScrolled ? 'bg-base-100/60' : 'bg-base-200/40 backdrop-blur-md'}`}
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="kbd kbd-sm opacity-50 ml-2 border-none bg-base-300/50">⌘K</kbd>
            </button>
            <button onClick={() => setIsSearchOpen(true)} className="md:hidden btn btn-ghost btn-circle">
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <button onClick={() => setIsCartOpen(true)} className="btn btn-ghost btn-circle relative">
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="badge badge-sm badge-primary absolute top-0 right-0">{cartItemsCount}</span>
              )}
            </button>
            
            {/* User Profile / Login */}
            {isAuthenticated ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar ring ring-transparent hover:ring-primary/50 transition-shadow" aria-label="User Profile Menu">
                  <div className="w-9 rounded-full bg-gradient-to-tr from-primary to-secondary text-primary-content flex items-center justify-center font-bold text-lg shadow-inner">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <ul tabIndex={0} className="mt-4 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content bg-base-200/90 backdrop-blur-xl rounded-2xl w-56 border border-white/10">
                  <div className="px-4 py-3 border-b border-white/10 mb-2">
                    <p className="font-bold truncate">{user?.name}</p>
                    <p className="text-xs opacity-60 truncate">{user?.email}</p>
                  </div>
                  <li>
                    <Link to="/dashboard" className="rounded-lg hover:bg-white/10">
                      Dashboard
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link to="/admin" className="text-primary font-semibold rounded-lg hover:bg-white/10">
                        Admin Panel
                      </Link>
                    </li>
                  )}
                  <li className="mt-2"><button onClick={handleLogout} className="rounded-lg text-error hover:bg-error/20 transition-colors">Logout</button></li>
                </ul>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm rounded-full px-6 glow-effect border-none">Login</Link>
            )}
          </div>
        </div>
      </div>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </motion.header>
  );
}
