import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Lock } from 'lucide-react';

const AdminAccessButton: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);

  if (currentView.startsWith('admin-')) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <div className="relative">
        <button
          onClick={() => setCurrentView('admin-login')}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="group relative w-12 h-12 bg-[#D9FF3D] text-[#0B0F0C] rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        >
          <Lock className="w-5 h-5" />
        </button>

        {showTooltip && (
          <div className="absolute bottom-16 right-0 bg-[#111611] border border-[#1A211A] text-[#F6FFF2] text-xs px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none">
            Admin Login
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccessButton;
