// Force Vercel rebuild - lorelei avatars + new login profile (alex@test.com)
import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from '@/store/AppContext';
import { AdminProvider, useAdmin } from '@/store/AdminContext';
import { Toaster } from 'sonner';
import HeroSection from '@/sections/HeroSection';
import ProblemSection from '@/sections/ProblemSection';
import AssessmentSection from '@/sections/AssessmentSection';
import CommunityBlogPreviewSection from '@/sections/CommunityBlogPreviewSection';
import AssessmentResultSection from '@/sections/AssessmentResultSection';
import AssessmentReflectionSection from '@/sections/AssessmentReflectionSection';
import AssessmentNotCompletedSection from '@/sections/AssessmentNotCompletedSection';
import AlignmentSection from '@/sections/AlignmentSection';
import FamilySection from '@/sections/FamilySection';
import GrowthSection from '@/sections/GrowthSection';
import MembershipSection from '@/sections/MembershipSection';
import BrowseSection from '@/sections/BrowseSection';
import ProfileDetailSection from '@/sections/ProfileDetailSection';
import InboxSection from '@/sections/InboxSection';
import ConversationSection from '@/sections/ConversationSection';
import GrowthModeSection from '@/sections/GrowthModeSection';
import AwarePartnerSection from '@/sections/AwarePartnerSection';
import IntentionalPartnerSection from '@/sections/IntentionalPartnerSection';
import HealthyPartnerSection from '@/sections/HealthyPartnerSection';
import GrowthDetailSection from '@/sections/GrowthDetailSection';
import ClarityRoomSection from '@/sections/ClarityRoomSection';
import CommunityBlogPage from '@/sections/CommunityBlogPage';
import PaidGrowthModeSection from '@/sections/PaidGrowthModeSection';
import AdminLoginSection from '@/sections/AdminLoginSection';
import AdminLayout from '@/components/AdminLayout';
import AdminUsersSection from '@/sections/AdminUsersSection';
import AdminDashboardSection from '@/sections/AdminDashboardSection';
import AdminReportsSection from '@/sections/AdminReportsSection';
import AdminAssessmentsSection from '@/sections/AdminAssessmentsSection';
import AdminContentSection from '@/sections/AdminContentSection';
import AdminSupportSection from '@/sections/AdminSupportSection';
import UserLoginSection from '@/sections/UserLoginSection';
import PasswordResetSection from '@/sections/PasswordResetSection';
import SignUpSection from '@/sections/SignUpSection';
import UserSettingsSection from '@/sections/UserSettingsSection';
import PrivacyPolicySection from '@/sections/PrivacyPolicySection';
import TermsOfServiceSection from '@/sections/TermsOfServiceSection';
import CommunityGuidelinesSection from '@/sections/CommunityGuidelinesSection';
import LaunchingSoonSection from '@/sections/LaunchingSoonSection';
import LgbtqEmailConfirmationSection from '@/sections/LgbtqEmailConfirmationSection';
import EmailModal from '@/components/EmailModal';
import ContactSupportModal from '@/components/ContactSupportModal';
import Footer from '@/components/Footer';
import UserAccessButton from '@/components/UserAccessButton';
import ForestFloatingAssistant from '@/components/ForestFloatingAssistant';
import MeetingSafetyButton from '@/components/MeetingSafetyButton';
import {
  getStoredSitePreviewAccess,
  isSiteLockEnabled,
  resolveSitePreviewStateFromUrl,
} from '@/lib/siteLock';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, showSupportModal, setShowSupportModal, currentUser, isUserAuthenticated } = useApp();
  const { session } = useAdmin();
  const [authPoolBanner, setAuthPoolBanner] = React.useState<string | null>(null);
  const [hasSitePreviewAccess, setHasSitePreviewAccess] = React.useState<boolean>(() => getStoredSitePreviewAccess());
  const siteLockEnabled = isSiteLockEnabled();

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handlePoolRedirectBanner = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const message = customEvent.detail?.message;
      if (!message || typeof message !== 'string') return;

      setAuthPoolBanner(message);
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => setAuthPoolBanner(null), 5000);
    };

    window.addEventListener('auth-pool-redirect-banner', handlePoolRedirectBanner);
    return () => {
      window.removeEventListener('auth-pool-redirect-banner', handlePoolRedirectBanner);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  React.useEffect(() => {
    const { hasPreviewAccess, requestedAdminAccess } = resolveSitePreviewStateFromUrl();

    if (hasPreviewAccess !== hasSitePreviewAccess) {
      setHasSitePreviewAccess(hasPreviewAccess);
    }

    if (
      siteLockEnabled &&
      hasPreviewAccess &&
      requestedAdminAccess &&
      currentView !== 'admin-login' &&
      !currentView.startsWith('admin-')
    ) {
      setCurrentView('admin-login');
    }
  }, [currentView, hasSitePreviewAccess, setCurrentView, siteLockEnabled]);

  const showLaunchPreview = currentView === 'launching-soon-preview';
  const showWaitlistConfirmation = currentView === 'lgbtq-email-confirmation';
  const showLaunchHold =
    siteLockEnabled &&
    !hasSitePreviewAccess &&
    !session.isAuthenticated &&
    !showWaitlistConfirmation;
  const showForestAssistant = currentView !== 'landing' && currentView !== 'community-blog';
  const showMeetingSafetyButton = isUserAuthenticated && currentView !== 'landing';
  const hideShellChrome =
    showLaunchPreview ||
    showLaunchHold ||
    showWaitlistConfirmation ||
    currentView.startsWith('admin-') ||
    currentView === 'user-login' ||
    currentView === 'password-reset' ||
    currentView === 'sign-up';

  const renderView = () => {
    if (showLaunchPreview || showLaunchHold) {
      return <LaunchingSoonSection />;
    }

    if (currentView === 'lgbtq-email-confirmation') {
      return <LgbtqEmailConfirmationSection />;
    }

    if (currentView === 'user-login') {
      return <UserLoginSection />;
    }

    if (currentView === 'password-reset') {
      return <PasswordResetSection />;
    }

    if (currentView === 'sign-up') {
      return <SignUpSection />;
    }

    if (currentView === 'user-settings') {
      return <UserSettingsSection />;
    }

    // Public blog view (no authentication required)
    if (currentView === 'community-blog') {
      return <CommunityBlogPage />;
    }

    // Allow admin views to load regardless of user status
    if (currentView.startsWith('admin-')) {
      if (!session.isAuthenticated) {
        return <AdminLoginSection />;
      }

      const renderAdminView = () => {
        switch (currentView) {
          case 'admin-dashboard':
            return <AdminDashboardSection />;
          case 'admin-users':
            return <AdminUsersSection />;
          case 'admin-reports':
            return <AdminReportsSection />;
          case 'admin-assessments':
            return <AdminAssessmentsSection />;
          case 'admin-content':
            return <AdminContentSection />;
          case 'admin-settings':
            return <div className="p-8"><p className="text-[#A9B5AA]">Settings coming soon...</p></div>;
          case 'admin-support':
            return <AdminSupportSection />;
          default:
            return <AdminDashboardSection />;
        }
      };

      return <AdminLayout>{renderAdminView()}</AdminLayout>;
    }

    const userProtectedViews = new Set([
      'assessment',
      'assessment-reflection',
      'assessment-result',
      'assessment-not-completed',
      'browse',
      'profile',
      'inbox',
      'conversation',
      'growth-mode',
      'aware-partner',
      'intentional-partner',
      'healthy-partner',
      'growth-detail',
      'paid-growth-mode',
      'user-settings',
      'clarity-room',
    ]);

    if (userProtectedViews.has(currentView) && !isUserAuthenticated) {
      return <UserLoginSection />;
    }

    // Protect assessment view - only accessible to logged-in users
    if (currentView === 'assessment' && !currentUser) {
      return <UserLoginSection />;
    }

    switch (currentView) {
      case 'assessment':
        return <AssessmentSection />;
      case 'assessment-reflection':
        return <AssessmentReflectionSection />;
      case 'assessment-result':
        return <AssessmentResultSection />;
      case 'assessment-not-completed':
        return <AssessmentNotCompletedSection />;
      case 'browse':
        return <BrowseSection />;
      case 'profile':
        return <ProfileDetailSection />;
      case 'inbox':
        return <InboxSection />;
      case 'conversation':
        return <ConversationSection />;
      case 'growth-mode':
        return <GrowthModeSection />;
      case 'aware-partner':
        return <AwarePartnerSection />;
      case 'intentional-partner':
        return <IntentionalPartnerSection />;
      case 'healthy-partner':
        return <HealthyPartnerSection />;
      case 'growth-detail':
        return <GrowthDetailSection />;
      case 'paid-growth-mode':
        return <PaidGrowthModeSection />;
      case 'privacy-policy':
        return <PrivacyPolicySection />;
      case 'terms-of-service':
        return <TermsOfServiceSection />;
      case 'community-guidelines':
        return <CommunityGuidelinesSection />;
      case 'clarity-room':
        return <ClarityRoomSection />;
      case 'landing':
      default:
        return (
          <main className="relative">
            <div className="grain-overlay" />
            <HeroSection />
            <ProblemSection />
            <AssessmentSection />
            <CommunityBlogPreviewSection />
            <AlignmentSection />
            <FamilySection />
            <GrowthSection />
            <MembershipSection />
          </main>
        );
    }
  };

  return (
    <div className="relative bg-[#0B0F0C] min-h-screen flex flex-col">
      {authPoolBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-lg border border-[#2A312A] bg-[#111611] text-[#E8F2E8] text-sm shadow-xl">
          {authPoolBanner}
        </div>
      )}
      <div className="flex-1">
        {renderView()}
      </div>
      {!hideShellChrome && (
        <Footer />
      )}
      {!hideShellChrome && (
        <>
          <EmailModal />
          <ContactSupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
          <div
            className={`fixed right-4 z-[115] flex flex-col items-end gap-3 sm:right-8 ${
              currentView === 'landing' ? 'top-8' : 'top-24'
            }`}
          >
            <UserAccessButton />
            {(showMeetingSafetyButton || showForestAssistant) && (
              <div className="flex flex-col items-end gap-3">
                {showForestAssistant && <ForestFloatingAssistant />}
                {showMeetingSafetyButton && <MeetingSafetyButton />}
              </div>
            )}
          </div>
        </>
      )}
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
