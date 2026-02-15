import React from 'react';
import { useApp } from '@/store/AppContext';

const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="bg-[#111611] border-t border-[#1A211A] mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <h3 className="font-display text-lg text-[#F6FFF2] mb-1">Rooted Hearts</h3>
            <p className="text-sm text-[#A9B5AA]">Dating for people who are intentional.</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[#A9B5AA]">
            <button
              onClick={() => setCurrentView('privacy-policy')}
              className="hover:text-[#D9FF3D] transition-colors"
            >
              Privacy Policy
            </button>
            <div className="w-px h-4 bg-[#1A211A]" />
            <button
              onClick={() => setCurrentView('terms-of-service')}
              className="hover:text-[#D9FF3D] transition-colors"
            >
              Terms of Service
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-[#A9B5AA] text-center md:text-right">
            <p>© 2026 Rooted Hearts. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
