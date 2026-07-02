import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ShoppingBag } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-base-content/60 mt-1">Monitor your shop's performance and ApiRone transactions.</p>
        </div>
        <button className="btn btn-primary btn-sm hidden sm:flex shadow-sm hover:shadow-md transition-shadow">Generate Report</button>
      </header>
      
      {/* Stats Section */}
      <section aria-label="Key Metrics" className="stats stats-vertical lg:stats-horizontal shadow-sm border border-base-200 w-full bg-base-100">
        <div className="stat hover:bg-base-200/50 transition-colors">
          <div className="stat-figure text-primary">
            <Settings className="inline-block w-8 h-8 stroke-current opacity-80" />
          </div>
          <div className="stat-title font-medium">New Users</div>
          <div className="stat-value text-primary font-black">4,200</div>
          <div className="stat-desc font-medium text-success mt-1">↗︎ 400 (22%) vs last month</div>
        </div>
        
        <div className="stat hover:bg-base-200/50 transition-colors">
          <div className="stat-figure text-secondary">
            <ShoppingBag className="inline-block w-8 h-8 stroke-current opacity-80" />
          </div>
          <div className="stat-title font-medium">Crypto Revenue</div>
          <div className="stat-value text-secondary font-black">$12,800</div>
          <div className="stat-desc font-medium text-error mt-1">↘︎ 90 (14%) vs last month</div>
        </div>
        
        <div className="stat hover:bg-base-200/50 transition-colors">
          <div className="stat-figure text-info">
            <div className="avatar online ring ring-info ring-offset-base-100 ring-offset-2 rounded-full">
              <div className="w-14 rounded-full">
                <img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" alt="Admin Avatar" loading="lazy" />
              </div>
            </div>
          </div>
          <div className="stat-value font-black">86%</div>
          <div className="stat-title font-medium">Tasks done</div>
          <div className="stat-desc text-info font-medium mt-1">31 tasks remaining</div>
        </div>
      </section>

      {/* Orders Table */}
      <section aria-label="Recent Transactions" className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0 sm:p-6">
          <div className="flex justify-between items-center p-4 sm:p-0 mb-2">
            <h2 className="card-title text-lg font-bold">Recent Transactions (ApiRone)</h2>
            <button className="btn btn-ghost btn-xs text-primary">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-base-200/50 text-base-content/80">
                <tr>
                  <th className="font-semibold">Order ID</th>
                  <th className="font-semibold">Product</th>
                  <th className="font-semibold">Amount</th>
                  <th className="font-semibold">Crypto Tx Hash</th>
                  <th className="font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover">
                  <th className="font-medium text-base-content/70">#1001</th>
                  <td className="font-medium">Auto-Bot Script V2</td>
                  <td className="font-semibold">$49.99</td>
                  <td className="font-mono text-xs opacity-70">0xabc...def</td>
                  <td className="text-right"><div className="badge badge-success badge-sm font-medium">Completed</div></td>
                </tr>
                <tr className="hover">
                  <th className="font-medium text-base-content/70">#1002</th>
                  <td className="font-medium">SEO Toolkit App</td>
                  <td className="font-semibold">$99.00</td>
                  <td className="font-mono text-xs opacity-70">0x123...456</td>
                  <td className="text-right"><div className="badge badge-warning badge-sm font-medium">Pending</div></td>
                </tr>
                <tr className="hover">
                  <th className="font-medium text-base-content/70">#1003</th>
                  <td className="font-medium">Premium Admin Template</td>
                  <td className="font-semibold">$29.00</td>
                  <td className="font-mono text-xs opacity-70">0x999...111</td>
                  <td className="text-right"><div className="badge badge-success badge-sm font-medium">Completed</div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
