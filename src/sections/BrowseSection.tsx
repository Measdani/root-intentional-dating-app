import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MapPin, Heart, Eye, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import type { User } from '@/types';

const BrowseSection: React.FC = () => {
  const { users, setSelectedUser, setCurrentView } = useApp();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const filters = [
    { id: 'all', label: 'All Matches' },
    { id: 'high', label: '90%+ Alignment' },
    { id: 'wants-children', label: 'Wants Children' },
    { id: 'no-children', label: 'No Children' },
  ];

  const filteredUsers = users.filter(user => {
    if (selectedFilter === 'high') return (user.alignmentScore || 0) >= 90;
    if (selectedFilter === 'wants-children') return user.familyAlignment.wantsChildren === 'wants';
    if (selectedFilter === 'no-children') return !user.familyAlignment.hasChildren;
    return true;
  });

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setCurrentView('profile');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl text-[#F6FFF2]">Browse Profiles</h1>
            <p className="text-[#A9B5AA] text-xs">
              {filteredUsers.length} curated matches
            </p>
          </div>

          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 text-sm ${filterOpen ? 'text-[#D9FF3D]' : 'text-[#A9B5AA]'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="border-t border-[#1A211A] bg-[#111611]/50">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(selectedFilter === filter.id ? null : filter.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                        : 'bg-[#1A211A] text-[#A9B5AA] hover:bg-[#2A312A]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Profiles Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, idx) => (
            <div
              key={user.id}
              className="bg-[#111611] rounded-[24px] border border-[#1A211A] overflow-hidden hover:border-[#D9FF3D]/30 transition-all duration-300 group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                      <span className="text-[#0B0F0C] font-display text-lg">
                        {user.name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[#F6FFF2] font-semibold">{user.name}, {user.age}</h3>
                      <div className="flex items-center gap-1 text-[#A9B5AA] text-xs">
                        <MapPin className="w-3 h-3" />
                        {user.city}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-display text-[#D9FF3D]">
                      {user.alignmentScore}%
                    </div>
                    <div className="text-[10px] text-[#A9B5AA] font-mono-label">ALIGNMENT</div>
                  </div>
                </div>

                {/* Values */}
                <div className="mb-4">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-2">VALUES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.values.slice(0, 3).map((value, vidx) => (
                      <span
                        key={vidx}
                        className="px-2 py-0.5 bg-[#1A211A] text-[#F6FFF2] text-xs rounded-full"
                      >
                        {value}
                      </span>
                    ))}
                    {user.values.length > 3 && (
                      <span className="px-2 py-0.5 text-[#A9B5AA] text-xs">
                        +{user.values.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Family Intent */}
                <div className="mb-4">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-1">FAMILY INTENT</p>
                  <p className="text-[#F6FFF2] text-sm capitalize">
                    {user.familyAlignment.wantsChildren.replace(/-/g, ' ')}
                  </p>
                </div>

                {/* Growth Focus */}
                <div className="mb-5">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-1">GROWTH FOCUS</p>
                  <p className="text-[#F6FFF2] text-sm">{user.growthFocus}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewProfile(user)}
                    className="flex-1 py-2.5 bg-[#F6FFF2] text-[#0B0F0C] rounded-full text-sm font-medium hover:bg-[#D9FF3D] transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </button>
                  <button className="w-10 h-10 rounded-full border border-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:border-[#D9FF3D] hover:text-[#D9FF3D] transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#A9B5AA] text-lg">No matches found with current filters.</p>
            <button
              onClick={() => setSelectedFilter(null)}
              className="mt-4 text-[#D9FF3D] text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BrowseSection;
