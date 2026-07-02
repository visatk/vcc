import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';
import { toast } from 'sonner';

interface Product {
  id: number;
  title: string;
  description: string;
  priceUsd: number;
  type: 'file' | 'serial' | 'subscription' | 'service' | 'product';
  pricingModel: 'one-time' | 'free' | 'pay-what-you-want';
  minPriceUsd?: number | null;
  billingInterval?: 'monthly' | 'yearly' | null;
  imageUrl?: string;
  downloadUrl?: string;
  serialKey?: string;
}

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    type: 'file',
    pricingModel: 'one-time'
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean up irrelevant data before saving
      const dataToSave = { ...formData };
      if (dataToSave.pricingModel !== 'pay-what-you-want') {
        dataToSave.minPriceUsd = null;
      }
      if (dataToSave.type !== 'subscription') {
        dataToSave.billingInterval = null;
      }
      if (dataToSave.pricingModel === 'free') {
        dataToSave.priceUsd = 0;
      }

      if (dataToSave.id) {
        await api.put(`/products/${dataToSave.id}`, dataToSave);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', dataToSave);
        toast.success('Product created successfully');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error saving product');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting product');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products Manager</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => { setFormData({ type: 'file', pricingModel: 'one-time', priceUsd: 0 }); setIsModalOpen(true); }}
        >
          Add Product
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
                  <th>ID</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Pricing</th>
                  <th>Price (USD)</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="hover">
                    <td>{p.id}</td>
                    <td>
                      <div className="badge badge-outline capitalize">{p.type}</div>
                    </td>
                    <td className="font-medium">{p.title}</td>
                    <td>
                      <div className={`badge badge-sm ${p.pricingModel === 'free' ? 'badge-success' : p.pricingModel === 'pay-what-you-want' ? 'badge-secondary' : 'badge-ghost'}`}>
                        {p.pricingModel.replace(/-/g, ' ')}
                      </div>
                    </td>
                    <td>
                      {p.pricingModel === 'free' ? (
                        <span className="text-success font-bold">FREE</span>
                      ) : p.pricingModel === 'pay-what-you-want' ? (
                        <span>${p.minPriceUsd?.toFixed(2)}+</span>
                      ) : (
                        <span>${p.priceUsd?.toFixed(2)} {p.billingInterval ? `/${p.billingInterval}` : ''}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setFormData(p); setIsModalOpen(true); }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-ghost text-error ml-2">Delete</button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-xl mb-6">{formData.id ? 'Edit' : 'Add'} Product</h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text">Title</span></label>
                <input required type="text" className="input input-bordered" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Product Type</span></label>
                <select className="select select-bordered" value={formData.type || 'file'} onChange={e => setFormData({...formData, type: e.target.value as Product['type']})}>
                  <option value="file">Digital File</option>
                  <option value="serial">Serial Key</option>
                  <option value="subscription">Subscription</option>
                  <option value="service">Service</option>
                  <option value="product">Physical Product</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Pricing Model</span></label>
                <select className="select select-bordered" value={formData.pricingModel || 'one-time'} onChange={e => setFormData({...formData, pricingModel: e.target.value as Product['pricingModel']})}>
                  <option value="one-time">One-time Payment</option>
                  <option value="free">Free</option>
                  <option value="pay-what-you-want">Pay What You Want</option>
                </select>
              </div>

              {formData.pricingModel !== 'free' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      {formData.pricingModel === 'pay-what-you-want' ? 'Suggested Price ($)' : 'Price ($)'}
                    </span>
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="input input-bordered" 
                    value={formData.priceUsd || ''} 
                    onChange={e => setFormData({...formData, priceUsd: parseFloat(e.target.value)})} 
                  />
                </div>
              )}

              {formData.pricingModel === 'pay-what-you-want' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Minimum Price ($)</span></label>
                  <input required type="number" step="0.01" min="0" className="input input-bordered" value={formData.minPriceUsd || ''} onChange={e => setFormData({...formData, minPriceUsd: parseFloat(e.target.value)})} />
                </div>
              )}

              {formData.type === 'subscription' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Billing Interval</span></label>
                  <select required className="select select-bordered" value={formData.billingInterval || 'monthly'} onChange={e => setFormData({...formData, billingInterval: e.target.value as Product['billingInterval']})}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text">Description</span></label>
                <textarea className="textarea textarea-bordered h-24" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text">Image URL</span></label>
                <input type="text" className="input input-bordered" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
              </div>

              {formData.type === 'file' && (
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Download URL (Protected)</span></label>
                  <input type="text" className="input input-bordered" value={formData.downloadUrl || ''} onChange={e => setFormData({...formData, downloadUrl: e.target.value})} />
                </div>
              )}

              {formData.type === 'serial' && (
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text">Serial Key / Payload</span></label>
                  <input type="text" className="input input-bordered" value={formData.serialKey || ''} onChange={e => setFormData({...formData, serialKey: e.target.value})} />
                </div>
              )}

              <div className="modal-action md:col-span-2">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-8">Save Product</button>
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
