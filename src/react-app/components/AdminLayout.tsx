import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Package, Users, Tag, Ticket, ShoppingCart, ShieldAlert, BarChart3, LayoutDashboard, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AdminLayout() {
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogoutAdmin = () => {
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    isActive ? "active bg-primary text-primary-content shadow-sm" : "hover:bg-base-200 transition-colors";

  return (
    <div className="drawer lg:drawer-open font-sans">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" aria-label="Toggle admin sidebar" />
      
      {/* Page content */}
      <div className="drawer-content flex flex-col bg-base-200/50 min-h-screen">
        {/* Navbar for mobile only */}
        <header className="navbar bg-base-100/90 backdrop-blur-md lg:hidden shadow-sm sticky top-0 z-40 border-b border-base-200">
          <div className="flex-none">
            <label htmlFor="admin-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost hover:bg-base-200 transition-colors">
              <Menu className="inline-block w-6 h-6 stroke-current" />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold px-2">Admin Panel</h1>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div> 
      
      {/* Sidebar */}
      <div className="drawer-side z-50">
        <label htmlFor="admin-drawer" aria-label="close sidebar" className="drawer-overlay bg-base-300/40 backdrop-blur-sm"></label> 
        <aside className="menu p-4 w-80 min-h-full bg-base-100 text-base-content justify-between flex-nowrap border-r border-base-200 shadow-2xl lg:shadow-none">
          <div>
            <div className="text-2xl font-black mb-6 px-4 py-2 text-primary tracking-tight">ScriptMarket <span className="opacity-50 text-sm">Admin</span></div>
            <ul className="space-y-1 font-medium">
              <li><NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink></li>
              <li><NavLink to="/admin/analytics" className={navLinkClass}>Analytics (Phase 3)</NavLink></li>
              <li><NavLink to="/admin/fraud" className={navLinkClass}>Risk & Fraud</NavLink></li>
              <li><NavLink to="/admin/products" className={navLinkClass}>Products</NavLink></li>
              <li><NavLink to="/admin/coupons" className={navLinkClass}>Coupons</NavLink></li>
              <li><NavLink to="/admin/tickets" className={navLinkClass}>Tickets</NavLink></li>
              <li><NavLink to="/admin/carts" className={navLinkClass}>Abandoned Carts</NavLink></li>
              <li><NavLink to="/admin/orders" className={navLinkClass}>Orders (ApiRone)</NavLink></li>
              <li><NavLink to="/admin/customers" className={navLinkClass}>Customers</NavLink></li>
            </ul>
          </div>
          
          <div>
            <div className="divider my-2"></div>
            <ul className="font-medium">
              <li>
                <button 
                  onClick={handleLogoutAdmin} 
                  className="text-error hover:bg-error hover:text-error-content transition-all"
                  aria-label="Back to Store"
                >
                  Back to Store
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
