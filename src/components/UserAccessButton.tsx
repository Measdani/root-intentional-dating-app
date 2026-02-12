import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { User } from 'lucide-react';

const UserAccessButton: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, [currentView]);

  if (currentView.startsWith('admin-') || !currentView.includes('browse') && !currentView.includes('profile')) {
    return null;
  }

  return (
    <div className="fixed top-8 right-8 z-40">
      <div className="relative">
        <button
          onClick={() => {
            if (currentUser) {
              localStorage.removeItem('currentUser');
              setCurrentView('landing');
            } else {
              setCurrentView('user-login');
            }
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="group relative w-12 h-12 bg-green-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        >
          <User className="w-5 h-5" />
        </button>

        {showTooltip && (
          <div className="absolute top-16 right-0 bg-[#111611] border border-[#1A211A] text-[#F6FFF2] text-xs px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none">
            {currentUser ? `${currentUser.name} (Logout)` : 'User Login'}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAccessButton;
