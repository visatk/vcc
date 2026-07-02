import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { api } from '../utils/api';

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && products.length === 0) {
      setLoading(true);
      api.get<any[]>('/products').then(data => {
        setProducts(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen, products.length]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
        <Dialog.Content className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[201] p-4 outline-none">
          <Dialog.Title className="sr-only">Search Products</Dialog.Title>
          <Command className="bg-base-200/90 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col w-full text-base-content" label="Global Command Menu">
            <div className="flex items-center border-b border-white/10 px-4">
              <Search className="w-5 h-5 opacity-50 shrink-0" />
              <Command.Input placeholder="Search scripts, apps..." className="flex-1 bg-transparent border-none outline-none py-4 px-3 text-lg placeholder:text-base-content/40 focus:ring-0" />
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              <Command.Empty className="py-8 text-center text-sm opacity-50">No results found.</Command.Empty>
              {loading && <Command.Loading className="py-8 text-center text-sm opacity-50">Loading catalog...</Command.Loading>}
              {products.map(product => (
                <Command.Item
                  key={product.id}
                  value={product.title}
                  onSelect={() => {
                    navigate('/'); 
                    onClose();
                  }}
                  className="px-4 py-3 rounded-xl cursor-pointer flex items-center gap-4 aria-selected:bg-primary/20 aria-selected:text-primary transition-colors mb-1"
                >
                  <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-base-300" />
                  <div className="flex flex-col flex-1">
                    <span className="font-bold">{product.title}</span>
                    <span className="text-xs opacity-70 uppercase tracking-widest">{product.type}</span>
                  </div>
                  <span className="text-sm font-semibold opacity-70">${product.priceUsd.toFixed(2)}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
