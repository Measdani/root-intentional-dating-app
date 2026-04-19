import React, { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { getRelationshipModeSnapshot } from '@/modules';
import { openExclusiveModeSettings } from '@/lib/exclusiveModeNavigation';
import type { User } from '@/types';

const UserAccessButton: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  React.useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user) as User);
    } else {
      setCurrentUser(null);
    }
  }, [currentView]);

  const buttonLabel = currentUser ? (currentUser.isAdmin ? 'Admin' : 'Settings') : 'Login';
  const hasIncomingExclusiveRequest = useMemo(
    () =>
      Boolean(
        currentUser &&
          !currentUser.isAdmin &&
          getRelationshipModeSnapshot(currentUser.id).incomingExclusiveRequestFrom
      ),
    [currentUser]
  );

  if (currentView.startsWith('admin-') || currentView === 'user-login') {
    return null;
  }

  return (
    <button
      onClick={() => {
        if (currentUser) {
          if (currentUser.isAdmin) {
            setCurrentView('admin-dashboard');
            return;
          }

          if (hasIncomingExclusiveRequest) {
            openExclusiveModeSettings(setCurrentView);
            return;
          }

          setCurrentView('user-settings');
        } else {
          setCurrentView('user-login');
        }
      }}
      title={hasIncomingExclusiveRequest ? 'Exclusive request waiting in Settings' : undefined}
      className="relative btn-primary px-6 py-3 text-sm shadow-[0_14px_36px_rgba(0,0,0,0.32)] transition-all hover:scale-[1.02]"
    >
      {buttonLabel}
      {hasIncomingExclusiveRequest && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D9FF3D]/60" />
          <span className="relative inline-flex h-4 w-4 rounded-full border border-[#0B0F0C] bg-[#D9FF3D]" />
        </span>
      )}
    </button>
  );
};

export default UserAccessButton;
