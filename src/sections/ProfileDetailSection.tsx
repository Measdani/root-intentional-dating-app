import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, MapPin, Heart, MessageCircle, Shield, Users, Lock } from 'lucide-react';
import ExpressInterestModal from '@/components/ExpressInterestModal';

const ProfileDetailSection: React.FC = () => {
  const { selectedUser, currentUser, setCurrentView, setSelectedUser, expressInterest, hasExpressedInterest, arePhotosUnlocked } = useApp();
  const [showModal, setShowModal] = useState(false);

  if (!selectedUser) return null;

  const sharedValues = selectedUser.values.filter(v => currentUser.values.includes(v));
  const photosUnlocked = arePhotosUnlocked(selectedUser.id);
  const interestSent = hasExpressedInterest(selectedUser.id);

  const handleExpressInterest = (message: string) => {
    expressInterest(selectedUser.id, message);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedUser(null);
              setCurrentView('browse');
            }}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to browse</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-2xl font-display text-[#D9FF3D]">
                {selectedUser.alignmentScore}%
              </div>
              <div className="text-[10px] text-[#A9B5AA] font-mono-label">ALIGNMENT</div>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-[#111611] rounded-[32px] border border-[#1A211A] overflow-hidden">
          {/* Profile Header */}
          <div className="p-8 md:p-10 border-b border-[#1A211A]">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                {photosUnlocked && selectedUser.photoUrl ? (
                  <img
                    src={selectedUser.photoUrl}
                    alt={selectedUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <>
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                      <span className="text-[#0B0F0C] font-display text-4xl md:text-5xl">
                        {selectedUser.name[0]}
                      </span>
                    </div>
                    {!photosUnlocked && (
                      <div className="absolute inset-0 bg-[#0B0F0C]/30 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[#F6FFF2]" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1">
                <h1 className="font-display text-3xl md:text-4xl text-[#F6FFF2] mb-2">
                  {selectedUser.name}, {selectedUser.age}
                </h1>
                <div className="flex items-center gap-2 text-[#A9B5AA] mb-4">
                  <MapPin className="w-4 h-4" />
                  {selectedUser.city}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#1A211A] text-[#A9B5AA] text-sm rounded-full flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                  <span className="px-3 py-1 bg-[#D9FF3D]/10 text-[#D9FF3D] text-sm rounded-full">
                    {selectedUser.partnershipIntent.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="w-12 h-12 rounded-full border border-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:border-[#D9FF3D] hover:text-[#D9FF3D] transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Body */}
          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Left Column */}
              <div>
                {/* Relationship Vision */}
                {selectedUser.relationshipVision && (
                  <div className="mb-8 bg-[#1A211A]/50 rounded-2xl p-6 border border-[#D9FF3D]/20">
                    <h3 className="font-mono-label text-[#D9FF3D] mb-3">✨ Relationship Vision</h3>
                    <p className="text-[#F6FFF2] leading-relaxed text-sm">{selectedUser.relationshipVision}</p>
                  </div>
                )}

                {/* Express Interest Button */}
                {!interestSent && (
                  <div className="mb-8">
                    <button
                      onClick={() => setShowModal(true)}
                      className="w-full py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-2xl font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Express Interest
                    </button>
                  </div>
                )}

                {interestSent && (
                  <div className="mb-8 py-3.5 px-6 bg-green-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 text-center">
                    <MessageCircle className="w-4 h-4" />
                    Interest Sent
                  </div>
                )}

                {/* Communication Style */}
                {selectedUser.communicationStyle && (
                  <div className="mb-8 bg-[#1A211A]/50 rounded-2xl p-6">
                    <h3 className="font-mono-label text-[#A9B5AA] mb-3">How They Communicate</h3>
                    <p className="text-[#F6FFF2] leading-relaxed text-sm">{selectedUser.communicationStyle}</p>
                  </div>
                )}

                {/* Bio / About */}
                {selectedUser.bio && (
                  <div className="mb-8">
                    <h3 className="font-mono-label text-[#A9B5AA] mb-3">About</h3>
                    <p className="text-[#F6FFF2] leading-relaxed text-sm">{selectedUser.bio}</p>
                  </div>
                )}

                {/* Values */}
                <div className="mb-8">
                  <h3 className="font-mono-label text-[#A9B5AA] mb-3">Top 5 Values</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.values.map((value, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          sharedValues.includes(value)
                            ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                            : 'bg-[#1A211A] text-[#F6FFF2]'
                        }`}
                      >
                        {value}
                        {sharedValues.includes(value) && (
                          <span className="ml-1 text-xs opacity-70">(shared)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Growth Focus */}
                <div className="bg-[#1A211A]/50 rounded-2xl p-6">
                  <h3 className="font-mono-label text-[#A9B5AA] mb-3">Working On</h3>
                  <p className="text-[#F6FFF2] font-medium">{selectedUser.growthFocus}</p>
                  <p className="text-xs text-[#A9B5AA] mt-3">Actively developing this area for stronger relationships.</p>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Family Alignment */}
                <div className="bg-[#1A211A]/50 rounded-2xl p-6 mb-6">
                  <h3 className="font-mono-label text-[#A9B5AA] mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Family Alignment
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[#A9B5AA] mb-1">Has Children</p>
                      <p className="text-[#F6FFF2]">
                        {selectedUser.familyAlignment.hasChildren ? 'Yes' : 'No'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#A9B5AA] mb-1">Future Children</p>
                      <p className="text-[#F6FFF2] capitalize">
                        {selectedUser.familyAlignment.wantsChildren.replace(/-/g, ' ')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#A9B5AA] mb-1">Open to Partner with Children</p>
                      <p className="text-[#F6FFF2] capitalize">
                        {selectedUser.familyAlignment.openToPartnerWithParent.replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alignment Breakdown */}
                <div className="bg-[#1A211A]/50 rounded-2xl p-6">
                  <h3 className="font-mono-label text-[#A9B5AA] mb-4">Compatibility</h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#F6FFF2] text-sm">Shared Values</span>
                        <span className={`text-sm font-medium ${sharedValues.length === 0 ? 'text-[#A9B5AA]' : 'text-[#D9FF3D]'}`}>
                          {sharedValues.length === 0 ? 'Different value set' : `${sharedValues.length} of ${selectedUser.values.length}`}
                        </span>
                      </div>
                      <div className="h-2 bg-[#0B0F0C] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sharedValues.length === 0 ? 'bg-[#A9B5AA]' : 'bg-[#D9FF3D]'}`}
                          style={{ width: `${(sharedValues.length / selectedUser.values.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[#F6FFF2] text-sm">Family Intent</span>
                      <span className={selectedUser.familyAlignment.wantsChildren === currentUser.familyAlignment.wantsChildren ? 'text-[#D9FF3D]' : 'text-yellow-400'}>
                        {selectedUser.familyAlignment.wantsChildren === currentUser.familyAlignment.wantsChildren ? 'Aligned' : 'Needs Discussion'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[#F6FFF2] text-sm">Partnership Vision</span>
                      <span className={selectedUser.partnershipIntent === currentUser.partnershipIntent ? 'text-[#D9FF3D]' : 'text-[#A9B5AA]'}>
                        {selectedUser.partnershipIntent === currentUser.partnershipIntent ? 'Aligned' : 'Compatible'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Express Interest Modal */}
      <ExpressInterestModal
        isOpen={showModal}
        targetUser={selectedUser}
        onClose={() => setShowModal(false)}
        onSubmit={handleExpressInterest}
      />
    </div>
  );
};

export default ProfileDetailSection;
