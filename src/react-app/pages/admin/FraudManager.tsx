import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { toast } from "sonner";

interface BlacklistItem {
  id: number;
  type: 'ip' | 'email';
  value: string;
  reason: string;
  createdAt: number;
}

export default function FraudManager() {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [type, setType] = useState<'ip' | 'email'>('ip');
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const loadBlacklist = () => {
    setIsLoading(true);
    api.get<BlacklistItem[]>("/fraud/blacklist")
      .then(setBlacklist)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/fraud/blacklist", { type, value, reason });
      toast.success("Added to blacklist");
      setValue("");
      setReason("");
      loadBlacklist();
    } catch (err: any) {
      toast.error(err.message || "Failed to add to blacklist");
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    try {
      await api.delete(`/fraud/blacklist/${id}`);
      toast.success("Entry removed");
      loadBlacklist();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-8">Risk & Fraud Management</h1>
      
      <div className="bg-base-200/50 p-6 rounded-box border border-white/5 mb-8">
        <h2 className="text-xl font-bold mb-4">Add Blacklist Entry</h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="form-control w-full max-w-xs">
            <label className="label"><span className="label-text">Type</span></label>
            <select className="select select-bordered" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="ip">IP Address</option>
              <option value="email">Email Address</option>
            </select>
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Value</span></label>
            <input type="text" className="input input-bordered w-full" value={value} onChange={e => setValue(e.target.value)} required />
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Reason (Optional)</span></label>
            <input type="text" className="input input-bordered w-full" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-error">Block</button>
        </form>
      </div>

      <div className="overflow-x-auto bg-base-200/50 rounded-box border border-white/5">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>Reason</th>
              <th>Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
            ) : blacklist.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 opacity-50">No blacklisted entries</td></tr>
            ) : (
              blacklist.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`badge ${item.type === 'ip' ? 'badge-warning' : 'badge-secondary'}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="font-mono">{item.value}</td>
                  <td>{item.reason || '-'}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleRemove(item.id)} className="btn btn-ghost btn-xs text-error">Remove</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
