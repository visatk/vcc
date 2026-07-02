import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { motion } from "framer-motion";

interface AnalyticsData {
  totalRevenue: number;
  recentRevenue: number;
  totalUsers: number;
  totalOrders: number;
  topProducts: Array<{
    productId: number;
    title: string;
    salesCount: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsData>("/analytics/overview")
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><span className="loading loading-spinner text-primary loading-lg"></span></div>;
  }

  if (!data) return <div className="p-8">Error loading analytics.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-8">Enterprise Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-base-200/50 p-6 rounded-box border border-white/5">
          <h3 className="text-base-content/60 text-sm font-bold uppercase mb-2">Total Revenue</h3>
          <div className="text-4xl font-black text-success">${data.totalRevenue.toFixed(2)}</div>
        </div>
        
        <div className="bg-base-200/50 p-6 rounded-box border border-white/5">
          <h3 className="text-base-content/60 text-sm font-bold uppercase mb-2">30-Day Revenue</h3>
          <div className="text-4xl font-black text-primary">${data.recentRevenue.toFixed(2)}</div>
        </div>
        
        <div className="bg-base-200/50 p-6 rounded-box border border-white/5">
          <h3 className="text-base-content/60 text-sm font-bold uppercase mb-2">Total Users</h3>
          <div className="text-4xl font-black">{data.totalUsers}</div>
        </div>
        
        <div className="bg-base-200/50 p-6 rounded-box border border-white/5">
          <h3 className="text-base-content/60 text-sm font-bold uppercase mb-2">Total Sales</h3>
          <div className="text-4xl font-black">{data.totalOrders}</div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Top Performing Products</h2>
      <div className="overflow-x-auto bg-base-200/50 rounded-box border border-white/5">
        <table className="table w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Title</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {data.topProducts.map((p) => (
              <tr key={p.productId}>
                <td>{p.productId}</td>
                <td className="font-bold">{p.title}</td>
                <td><div className="badge badge-primary badge-outline">{p.salesCount} sold</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
