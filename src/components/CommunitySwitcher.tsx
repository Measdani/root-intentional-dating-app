import React from 'react';
import { useCommunity } from '@/modules';

interface CommunitySwitcherProps {
  className?: string;
}

const CommunitySwitcher: React.FC<CommunitySwitcherProps> = ({ className = '' }) => {
  const { activeCommunity, communities, switchCommunity } = useCommunity();

  const alternateCommunities = communities.filter(
    (community) => community.id !== activeCommunity.id
  );

  if (alternateCommunities.length === 0) return null;

  return (
    <div className={className}>
      {alternateCommunities.map((community) => (
        <button
          key={community.id}
          onClick={() => switchCommunity(community.id)}
          className="text-xs text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
        >
          Switch to {community.shortName}
        </button>
      ))}
    </div>
  );
};

export default CommunitySwitcher;
