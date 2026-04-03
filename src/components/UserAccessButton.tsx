import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';

const UserAccessButton: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
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

  const buttonLabel = currentUser ? (currentUser.isAdmin ? 'Admin' : 'Settings') : 'Login';

  return (
    <button
      onClick={() => {
        if (currentUser) {
          setCurrentView(currentUser.isAdmin ? 'admin-dashboard' : 'user-settings');
        } else {
          setCurrentView('user-login');
        }
      }}
      className="btn-primary px-6 py-3 text-sm shadow-[0_14px_36px_rgba(0,0,0,0.32)] transition-all hover:scale-[1.02]"
    >
      {buttonLabel}
    </button>
  );
};

export default UserAccessButton;
