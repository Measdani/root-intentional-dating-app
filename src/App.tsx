import React from 'react';
import { AppProvider, useApp } from '@/store/AppContext';
import { AdminProvider, useAdmin } from '@/store/AdminContext';
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
import GrowthModeSection from '@/sections/GrowthModeSection';
import AdminLoginSection from '@/sections/AdminLoginSection';
import AdminLayout from '@/components/AdminLayout';
import AdminUsersSection from '@/sections/AdminUsersSection';
import AdminDashboardSection from '@/sections/AdminDashboardSection';
import EmailModal from '@/components/EmailModal';

const AppContent: React.FC = () => {
  const { currentView } = useApp();
  const { session } = useAdmin();

  // Render different views based on currentView state
  const renderView = () => {
    // Handle admin routes
    if (currentView.startsWith('admin-')) {
      // Check authentication
      if (!session.isAuthenticated) {
        return <AdminLoginSection />;
      }

      // Render admin views wrapped in layout
      const renderAdminView = () => {
        switch (currentView) {
          case 'admin-dashboard':
            return <AdminDashboardSection />;
          case 'admin-users':
            return <AdminUsersSection />;
          case 'admin-assessments':
            return <div className="p-8"><p className="text-[#A9B5AA]">Assessment management coming soon...</p></div>;
          case 'admin-content':
            return <div className="p-8"><p className="text-[#A9B5AA]">Content management coming soon...</p></div>;
          case 'admin-settings':
            return <div className="p-8"><p className="text-[#A9B5AA]">Settings coming soon...</p></div>;
          default:
            return <AdminDashboardSection />;
        }
      };

      return <AdminLayout>{renderAdminView()}</AdminLayout>;
    }

    // Regular app views
    switch (currentView) {
      case 'assessment-result':
        return <AssessmentResultSection />;
      case 'browse':
        return <BrowseSection />;
      case 'profile':
        return <ProfileDetailSection />;
      case 'growth-mode':
        return <GrowthModeSection />;
      case 'landing':
      default:
        return (
          <main className="relative">
            {/* Grain Overlay */}
            <div className="grain-overlay" />

            {/* Landing Page Sections */}
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
    <div className="relative bg-[#0B0F0C] min-h-screen">
      {renderView()}
      {!currentView.startsWith('admin-') && <EmailModal />}
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
