import React from 'react';
import { useAdmin } from '@/store/AdminContext';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, session } = useAdmin();
  const { setCurrentView } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-assessments', label: 'Assessments', icon: ClipboardCheck },
    { id: 'admin-content', label: 'Content', icon: FileText },
    { id: 'admin-settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (view: string) => {
    setCurrentView(view as any);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setCurrentView('landing');
  };

  return (
    <div className="flex h-screen bg-[#0B0F0C]">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111611] border-r border-[#1A211A] transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#1A211A]">
          <h1 className="text-lg font-display font-bold text-[#D9FF3D]">
            Rooted
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#A9B5AA] hover:text-[#F6FFF2]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[#A9B5AA] hover:bg-[#1A211A] hover:text-[#F6FFF2]"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[#1A211A] space-y-2">
          <p className="text-xs text-[#A9B5AA] px-2">
            Logged in as{' '}
            <span className="text-[#F6FFF2] font-semibold">
              {session.adminUser?.name}
            </span>
          </p>
          <p className="text-xs text-[#A9B5AA] px-2 capitalize">
            Role: {session.adminUser?.role.replace('-', ' ')}
          </p>
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#111611] border-b border-[#1A211A] px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-[#A9B5AA] hover:text-[#F6FFF2]"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-display font-bold text-[#F6FFF2] ml-4 lg:ml-0 flex-1">
              Admin Panel
            </h2>
            <div className="text-sm text-[#A9B5AA]">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-[#0B0F0C]">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
