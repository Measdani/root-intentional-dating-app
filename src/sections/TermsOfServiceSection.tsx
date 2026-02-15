import React from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft } from 'lucide-react';

const TermsOfServiceSection: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F6FFF2]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="font-display text-2xl font-bold">Terms of Service</h1>
          <div className="w-32" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8 text-[#A9B5AA]">
          <section>
            <p className="text-sm mb-4">
              <strong>Effective Date: February 14, 2026</strong>
            </p>
            <p className="mb-4">
              Welcome to Rooted Hearts. These Terms of Service ("Terms") govern your access to and use of our website, mobile application, and related services (collectively, the "Platform"). By accessing or using Rooted Hearts, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you may not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">1. User Eligibility</h2>
            <p className="mb-4">
              By using Rooted Hearts, you represent and warrant that:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• You are at least 25 years of age.</li>
              <li>• You have the legal capacity to enter into a binding agreement.</li>
              <li>• You are not prohibited by any applicable laws from using the Platform.</li>
              <li>• You will not use the Platform for any illegal or unauthorized purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">2. Account Registration</h2>
            <p className="mb-4">
              To access certain features of Rooted Hearts, you must create an account. When creating an account, you agree to:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• Provide accurate, truthful, and complete information.</li>
              <li>• Keep your login credentials confidential and secure.</li>
              <li>• Accept responsibility for all activity on your account.</li>
              <li>• Notify us immediately of any unauthorized access to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">3. User Conduct and Community Guidelines</h2>
            <p className="mb-4">
              Users of Rooted Hearts must adhere to our Community Guidelines. Prohibited conduct includes, but is not limited to:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• Harassment, bullying, or threatening behavior toward other users.</li>
              <li>• Posting or sharing explicit, obscene, or inappropriate content.</li>
              <li>• Creating fake or misleading profiles or misrepresenting your identity.</li>
              <li>• Spamming or sending unsolicited messages.</li>
              <li>• Engaging in sexual exploitation or abuse.</li>
              <li>• Violating the privacy or rights of other users.</li>
              <li>• Attempting to manipulate or defraud other users.</li>
            </ul>
            <p className="mt-4">
              Users who violate these guidelines may face warnings, temporary suspension, or permanent removal from the Platform, at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">4. Intellectual Property Rights</h2>
            <p className="mb-4">
              All content, features, and functionality of Rooted Hearts (including but not limited to logos, graphics, text, and software) are owned by Rooted Hearts or its licensors. Users retain ownership of any content they post or upload to the Platform, but grant Rooted Hearts a worldwide, non-exclusive, royalty-free license to use, copy, modify, and display such content for the purpose of operating the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">5. Limitation of Liability</h2>
            <p className="mb-4">
              To the maximum extent permitted by law, Rooted Hearts shall not be liable for any indirect, incidental, special, or consequential damages arising out of or related to your use of the Platform. This includes, but is not limited to, damages for loss of profits, data, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">6. Disclaimer of Warranties</h2>
            <p className="mb-4">
              Rooted Hearts is provided on an "as-is" and "as-available" basis without warranties of any kind. We do not guarantee that the Platform will be error-free, uninterrupted, or secure. We disclaim all express and implied warranties, including but not limited to warranties of merchantability and fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">7. Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify, defend, and hold harmless Rooted Hearts and its officers, employees, and agents from any claims, damages, or costs (including legal fees) arising from your violation of these Terms or your use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">8. Termination</h2>
            <p className="mb-4">
              Rooted Hearts may suspend or terminate your account at any time for any reason, including violations of these Terms or Community Guidelines. Upon termination, your right to use the Platform immediately ceases.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">9. Modifications to Terms</h2>
            <p className="mb-4">
              We may update these Terms at any time. If we make material changes, we will notify you by posting the updated Terms on the Platform and updating the "Effective Date." Your continued use of Rooted Hearts after such changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">10. Governing Law</h2>
            <p className="mb-4">
              These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Rooted Hearts operates, without regard to its conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="p-4 bg-[#111611] rounded-lg border border-[#1A211A]">
              <p><strong>Rooted Hearts</strong></p>
              <p>Email: <strong>support@rootedhearts.net</strong></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsOfServiceSection;
