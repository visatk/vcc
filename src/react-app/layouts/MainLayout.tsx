import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col font-sans text-base-content">
      <Navbar />
      <div className="flex-1 pt-24">
        <Outlet />
      </div>
    </div>
  );
}
