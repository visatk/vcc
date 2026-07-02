import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

interface Order {
  id: number;
  userId: number;
  totalUsd: number;
  cryptoCurrency: string;
  cryptoAmount: string;
  depositAddress: string;
  status: string;
  createdAt: number;
  user: {
    name: string;
    email: string;
  }
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>('/orders')
      .then(data => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders Manager</h1>
      </div>

      <div className="bg-base-100 shadow-sm border border-base-200 rounded-box overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Crypto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="hover">
                  <td>#{o.id}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="font-medium">{o.user?.name || `User #${o.userId}`}</div>
                    <div className="text-xs opacity-70">{o.user?.email || 'N/A'}</div>
                  </td>
                  <td className="font-semibold">${o.totalUsd.toFixed(2)}</td>
                  <td>
                    {o.cryptoAmount} {o.cryptoCurrency?.toUpperCase()}
                    <div className="text-xs font-mono opacity-50 truncate w-32" title={o.depositAddress}>{o.depositAddress}</div>
                  </td>
                  <td>
                    <div className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                      {o.status}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
