// Force Vercel rebuild - lorelei avatars + new login profile (alex@test.com)
import React from 'react';
import { AppProvider, useApp } from '@/store/AppContext';
import { AdminProvider, useAdmin } from '@/store/AdminContext';
import { Toaster } from 'sonner';
import HeroSection from '@/sections/HeroSection';
import ProblemSection from '@/sections/ProblemSection';
import AssessmentSection from '@/sections/AssessmentSection';
import AssessmentResultSection from '@/sections/AssessmentResultSection';
import AlignmentSection from '@/sections/AlignmentSection';
import FamilySection from '@/sections/FamilySection';
import GrowthSection from '@/sections/GrowthSection';
import MembershipSection from '@/sections/MembershipSection';
import BrowseSection from '@/sections/BrowseSection';
import ProfileDetailSection from '@/sections/ProfileDetailSection';
import InboxSection from '@/sections/InboxSection';
import ConversationSection from '@/sections/ConversationSection';
import GrowthModeSection from '@/sections/GrowthModeSection';
import GrowthDetailSection from '@/sections/GrowthDetailSection';
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
import PrivacyPolicySection from '@/sections/PrivacyPolicySection';
import TermsOfServiceSection from '@/sections/TermsOfServiceSection';
import CommunityGuidelinesSection from '@/sections/CommunityGuidelinesSection';
import EmailModal from '@/components/EmailModal';
import ContactSupportModal from '@/components/ContactSupportModal';
import Footer from '@/components/Footer';
import AdminAccessButton from '@/components/AdminAccessButton';
import UserAccessButton from '@/components/UserAccessButton';

const AppContent: React.FC = () => {
  const { currentView, showSupportModal, setShowSupportModal } = useApp();
  const { session } = useAdmin();

  const renderView = () => {
    if (currentView === 'user-login') {
      return <UserLoginSection />;
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


    switch (currentView) {
      case 'assessment-result':
        return <AssessmentResultSection />;
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
      case 'landing':
      default:
        return (
          <main className="relative">
            <div className="grain-overlay" />
            <HeroSection />
            <ProblemSection />
            <AssessmentSection />
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
      <div className="flex-1">
        {renderView()}
      </div>
      {!currentView.startsWith('admin-') && currentView !== 'user-login' && (
        <Footer />
      )}
      {!currentView.startsWith('admin-') && currentView !== 'user-login' && (
        <>
          <EmailModal />
          <ContactSupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
          <AdminAccessButton />
          <UserAccessButton />
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
      </AppProvider>
    </AdminProvider>
  );
}

export default App;
