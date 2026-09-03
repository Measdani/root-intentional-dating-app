import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { AppProvider, useApp } from '@/store/AppContext';
import { AdminProvider, useAdmin } from '@/store/AdminContext';
import NewLandingSection from '@/sections/NewLandingSection';
import LearningPlatformSection from '@/sections/LearningPlatformSection';
import UserLoginSection from '@/sections/UserLoginSection';
import SignUpSection from '@/sections/SignUpSection';
import PasswordResetSection from '@/sections/PasswordResetSection';
import LifetimeAccessSection from '@/sections/LifetimeAccessSection';
import LearningAccountSection from '@/sections/LearningAccountSection';
import PrivacyPolicySection from '@/sections/PrivacyPolicySection';
import TermsOfServiceSection from '@/sections/TermsOfServiceSection';
import AdminLoginSection from '@/sections/AdminLoginSection';
import AdminLayout from '@/components/AdminLayout';
import AdminUsersSection from '@/sections/AdminUsersSection';
import AdminDashboardSection from '@/sections/AdminDashboardSection';
import AdminReportsSection from '@/sections/AdminReportsSection';
import AdminAssessmentsSection from '@/sections/AdminAssessmentsSection';
import AdminContentSection from '@/sections/AdminContentSection';
import AdminSupportSection from '@/sections/AdminSupportSection';
import ContactSupportModal from '@/components/ContactSupportModal';
import LaunchingSoonSection from '@/sections/LaunchingSoonSection';
import {
  getStoredSitePreviewAccess,
  isSiteLockEnabled,
  resolveSitePreviewStateFromUrl,
} from '@/lib/siteLock';

const memberViews = new Set([
  'home',
  'learning-library',
  'ask-rooted-hearts',
  'saved-content',
  'journal',
  'learning-progress',
]);

const AppContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    showSupportModal,
    setShowSupportModal,
    isUserAuthenticated,
  } = useApp();
  const { session } = useAdmin();
  const [hasSitePreviewAccess, setHasSitePreviewAccess] = React.useState(() => getStoredSitePreviewAccess());
  const siteLockEnabled = isSiteLockEnabled();

  React.useEffect(() => {
    const { hasPreviewAccess, requestedAdminAccess } = resolveSitePreviewStateFromUrl();
    if (hasPreviewAccess !== hasSitePreviewAccess) setHasSitePreviewAccess(hasPreviewAccess);
    if (siteLockEnabled && hasPreviewAccess && requestedAdminAccess && !currentView.startsWith('admin-')) {
      setCurrentView('admin-login');
    }
  }, [currentView, hasSitePreviewAccess, setCurrentView, siteLockEnabled]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentView]);

  const renderAdmin = () => {
    if (!session.isAuthenticated) return <AdminLoginSection />;

    const content = (() => {
      switch (currentView) {
        case 'admin-users':
          return <AdminUsersSection />;
        case 'admin-assessments':
          return <AdminAssessmentsSection />;
        case 'admin-reports':
          return <AdminReportsSection />;
        case 'admin-content':
          return <AdminContentSection />;
        case 'admin-support':
          return <AdminSupportSection />;
        case 'admin-settings':
          return <div className="p-8 text-[#A9B5AA]">Settings coming soon.</div>;
        case 'admin-dashboard':
        default:
          return <AdminDashboardSection />;
      }
    })();

    return <AdminLayout>{content}</AdminLayout>;
  };

  const renderView = () => {
    if (currentView.startsWith('admin-')) return renderAdmin();

    if (siteLockEnabled && !hasSitePreviewAccess && !session.isAuthenticated) {
      return <LaunchingSoonSection />;
    }

    switch (currentView) {
      case 'user-login':
        return <UserLoginSection />;
      case 'password-reset':
        return <PasswordResetSection />;
      case 'sign-up':
        return <LifetimeAccessSection />;
      case 'create-account':
        return <SignUpSection />;
      case 'user-settings':
        return isUserAuthenticated ? <LearningAccountSection /> : <UserLoginSection />;
      case 'privacy-policy':
        return <PrivacyPolicySection />;
      case 'terms-of-service':
        return <TermsOfServiceSection />;
      case 'landing':
        return isUserAuthenticated ? <LearningPlatformSection /> : <NewLandingSection />;
      default:
        if (memberViews.has(currentView)) {
          return isUserAuthenticated ? <LearningPlatformSection /> : <UserLoginSection />;
        }
        return isUserAuthenticated ? <LearningPlatformSection /> : <NewLandingSection />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {renderView()}
      <ContactSupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
};

function App() {
  return (
    <AdminProvider>
      <AppProvider>
        <AppContent />
        <Analytics />
      </AppProvider>
    </AdminProvider>
  );
}

export default App;
