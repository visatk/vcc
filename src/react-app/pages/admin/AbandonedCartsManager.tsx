import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { toast } from 'sonner';

interface Cart {
  id: number;
  userId: number;
  cartDataJson: string;
  recovered: boolean;
  emailSentAt: number | null;
  updatedAt: number;
  user: { name: string; email: string };
}

export default function AbandonedCartsManager() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    try {
      const data = await api.get<Cart[]>('/cart/abandoned');
      setCarts(data);
    } catch (err) {
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Abandoned Carts</h2>
          <p className="text-base-content/60 mt-1">Track users who added items but didn't check out.</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-200">
        <table className="table">
          <thead className="bg-base-200/50">
            <tr>
              <th>User</th>
              <th>Items in Cart</th>
              <th>Total Value</th>
              <th>Last Activity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {carts.map(cart => {
              const items = JSON.parse(cart.cartDataJson || '[]');
              const total = items.reduce((sum: number, i: any) => sum + i.priceUsd, 0);

              return (
                <tr key={cart.id}>
                  <td>
                    <div className="font-medium">{cart.user?.name}</div>
                    <div className="text-sm opacity-50">{cart.user?.email}</div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      {items.map((item: any, idx: number) => (
                        <span key={idx} className="badge badge-ghost badge-sm">{item.title}</span>
                      ))}
                    </div>
                  </td>
                  <td className="font-mono">${total.toFixed(2)}</td>
                  <td>{new Date(cart.updatedAt).toLocaleString()}</td>
                  <td>
                    {cart.recovered ? (
                      <span className="badge badge-success">Recovered</span>
                    ) : cart.emailSentAt ? (
                      <span className="badge badge-warning">Emailed</span>
                    ) : (
                      <span className="badge badge-error">Abandoned</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {carts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-base-content/50">No abandoned carts tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
