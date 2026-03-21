import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Settings } from 'lucide-react';

const UserAccessButton: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      setCurrentUser(null);
    }
  }, [currentView]);

  if (currentView.startsWith('admin-') || currentView === 'user-login') {
    return null;
  }

  return (
    <div>
      <div className="relative">
        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView(currentUser.isAdmin ? 'admin-dashboard' : 'user-settings');
            } else {
              setCurrentView('user-login');
            }
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-transform hover:scale-110"
        >
          <Settings className="w-5 h-5" />
        </button>

        {showTooltip && (
          <div className="absolute top-16 right-0 bg-[#111611] border border-[#1A211A] text-[#F6FFF2] text-xs px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none">
            {currentUser ? `${currentUser.name} (${currentUser.isAdmin ? 'Admin' : 'Settings'})` : 'User Login'}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAccessButton;
