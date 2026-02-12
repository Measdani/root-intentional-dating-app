import React from 'react';
import { AppProvider, useApp } from '@/store/AppContext';
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
import EmailModal from '@/components/EmailModal';

const AppContent: React.FC = () => {
  const { currentView } = useApp();

  // Render different views based on currentView state
  const renderView = () => {
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
      <EmailModal />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
