import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';
import { toast } from 'sonner';

interface Coupon {
  id: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usageLimit: number | null;
  usageCount: number;
  expiryDate: number | null;
  isActive: boolean;
  createdAt: number;
}

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [usageLimit, setUsageLimit] = useState<string>('');

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Coupon[]>('/coupons');
      setCoupons(data);
    } catch (err: any) {
      toast.error('Failed to load coupons');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code,
        discountType,
        discountValue,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
      };

      await api.post('/coupons', payload);
      toast.success('Coupon created successfully');
      setIsModalOpen(false);
      
      // Reset form
      setCode('');
      setDiscountValue(10);
      setUsageLimit('');
      
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Error creating coupon');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error: any) {
      toast.error('Error deleting coupon');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Coupons Manager</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsModalOpen(true)}
        >
          Add Coupon
        </button>
      </div>

      <div className="bg-base-100 shadow-sm border border-base-200 rounded-box overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} className="hover">
                    <td className="font-mono font-bold text-primary">{c.code}</td>
                    <td>
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}`}
                    </td>
                    <td>
                      {c.usageCount} / {c.usageLimit ? c.usageLimit : '∞'}
                    </td>
                    <td>
                      {c.isActive ? (
                        <span className="badge badge-success badge-sm">Active</span>
                      ) : (
                        <span className="badge badge-error badge-sm">Inactive</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button onClick={() => handleDelete(c.id)} className="btn btn-sm btn-ghost text-error">Delete</button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4">No coupons found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-xl mb-6">Add Coupon</h3>
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="form-control">
                <label className="label"><span className="label-text">Coupon Code</span></label>
                <input required type="text" className="input input-bordered font-mono uppercase" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20" />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Discount Type</span></label>
                <select className="select select-bordered" value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Discount Value</span></label>
                <input required type="number" step="0.01" min="0" className="input input-bordered" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value))} />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Usage Limit (Optional)</span></label>
                <input type="number" min="1" className="input input-bordered" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="Leave blank for unlimited" />
              </div>

              <div className="modal-action pt-4">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-8">Create Coupon</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
