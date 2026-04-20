import React from 'react';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';

const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="bg-[#111611] border-t border-[#1A211A] mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <BrandLogo className="mx-auto md:mx-0" imageClassName="w-[92px] sm:w-[108px]" />
            <p className="mt-3 text-sm text-[#A9B5AA]">Dating for people who are intentional.</p>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center gap-2 text-sm text-[#A9B5AA] sm:flex-row sm:gap-6">
            <button
              type="button"
              onClick={() => setCurrentView('privacy-policy')}
              className="rounded-full px-3 py-1.5 transition-colors hover:text-[#D9FF3D] focus:outline-none focus:ring-2 focus:ring-[#D9FF3D]/40"
            >
              Privacy Policy
            </button>
            <div className="hidden h-4 w-px bg-[#1A211A] sm:block" />
            <button
              type="button"
              onClick={() => setCurrentView('terms-of-service')}
              className="rounded-full px-3 py-1.5 transition-colors hover:text-[#D9FF3D] focus:outline-none focus:ring-2 focus:ring-[#D9FF3D]/40"
            >
              Terms of Service
            </button>
            <div className="hidden h-4 w-px bg-[#1A211A] sm:block" />
            <button
              type="button"
              onClick={() => setCurrentView('community-guidelines')}
              className="rounded-full px-3 py-1.5 text-center transition-colors hover:text-[#D9FF3D] focus:outline-none focus:ring-2 focus:ring-[#D9FF3D]/40"
            >
              Community Guidelines
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-[#A9B5AA] text-center md:text-right">
            <p>&copy; 2026 Rooted Hearts&trade;. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
