import React from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicySection: React.FC = () => {
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
          <h1 className="font-display text-2xl font-bold">Privacy Policy</h1>
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
              At Rooted Hearts, your privacy is of the utmost importance. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website and services (collectively, the "Services"). By accessing or using Rooted Hearts, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect personal information that you provide to us when you sign up for Rooted Hearts and use the platform. The types of personal information we collect include:</p>
            <ul className="space-y-2 ml-4">
              <li><strong>Account Information:</strong> Your name, email address, age, and profile information (e.g., preferences, photos).</li>
              <li><strong>Usage Data:</strong> Information about how you interact with Rooted Hearts, including device data, IP address, pages visited, and usage patterns.</li>
              <li><strong>Communication Data:</strong> Messages, interactions, and content you send or receive through the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use your personal information for the following purposes:</p>
            <ul className="space-y-2 ml-4">
              <li><strong>Account Management:</strong> To create and manage your account and profile.</li>
              <li><strong>Service Delivery:</strong> To provide access to Rooted Hearts' services, including connecting users, allowing messaging, and enabling features.</li>
              <li><strong>User Safety:</strong> To ensure the safety of users, protect against misuse of the platform, and address any reported violations of our Community Guidelines.</li>
              <li><strong>Improvement of Services:</strong> To analyze usage data and improve the functionality and security of Rooted Hearts.</li>
              <li><strong>Communication:</strong> To send you updates, notifications, and important information about the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">3. How We Protect Your Information</h2>
            <p className="mb-4">
              We take appropriate security measures to protect your personal information from unauthorized access, alteration, or destruction. We use industry-standard encryption methods, secure servers, and access controls to safeguard your data.
            </p>
            <p>
              However, no method of transmission over the Internet or electronic storage is completely secure, and while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">4. Sharing Your Information</h2>
            <p className="mb-4">We do not sell or rent your personal information to third parties. However, we may share your information in the following situations:</p>
            <ul className="space-y-2 ml-4">
              <li><strong>Service Providers:</strong> We may share information with third-party service providers who assist in the operation of Rooted Hearts, such as hosting services, customer support, and analytics.</li>
              <li><strong>Legal Compliance:</strong> We may disclose your information if required by law or in response to a valid legal request (e.g., to comply with a court order or government inquiry).</li>
              <li><strong>Safety and Protection:</strong> We may disclose your information to protect the rights, property, or safety of Rooted Hearts, our users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">5. Cookies and Tracking Technologies</h2>
            <p className="mb-4">We use cookies and similar tracking technologies to collect information about your usage of Rooted Hearts. These technologies help us provide personalized experiences, analyze platform usage, and improve our services.</p>
            <ul className="space-y-2 ml-4">
              <li><strong>Cookies:</strong> Small files stored on your device that help us recognize you and remember your preferences.</li>
              <li><strong>Web Beacons:</strong> Small graphic images or scripts used to monitor your activity on the platform.</li>
            </ul>
            <p className="mt-4">You can manage your cookie preferences through your browser settings. However, disabling cookies may impact the functionality of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">6. Your Rights and Choices</h2>
            <p className="mb-4">You have the following rights concerning your personal information:</p>
            <ul className="space-y-2 ml-4">
              <li><strong>Access:</strong> You can request access to the personal information we hold about you.</li>
              <li><strong>Correction:</strong> You can request corrections to inaccurate or incomplete personal information.</li>
              <li><strong>Deletion:</strong> You can request that we delete your personal information, subject to certain limitations (e.g., legal obligations).</li>
              <li><strong>Opt-out:</strong> You can opt-out of marketing communications by following the unsubscribe instructions in our emails.</li>
            </ul>
            <p className="mt-4">To exercise any of these rights, please contact us at <strong>support@rootedhearts.net</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services, comply with legal obligations, and resolve disputes. Once your account is deleted or inactive for an extended period, we will delete or anonymize your data as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">8. Children's Privacy</h2>
            <p>
              Rooted Hearts is intended for users aged 25 and older. We do not knowingly collect or solicit personal information from children under the age of 25. If we learn that we have collected personal information from a user under the age of 25, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. When we update the policy, we will post the new version on Rooted Hearts and update the "Effective Date" at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-[#F6FFF2] mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle your personal information, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-[#111611] rounded-lg border border-[#1A211A]">
              <p><strong>Rooted Hearts</strong></p>
              <p>Email: <strong>support@rootedhearts.net</strong></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicySection;
