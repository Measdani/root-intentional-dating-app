import React from 'react';
import { useCommunity } from '@/modules';

interface AuthPoolTabsProps {
  locked?: boolean;
  lockedMessage?: string;
}

const AuthPoolTabs: React.FC<AuthPoolTabsProps> = ({
  locked = false,
  lockedMessage,
}) => {
  const { activeCommunityId, communities, switchCommunity } = useCommunity();

  const communityOrder: Record<string, number> = {
    rooted: 0,
  };

  const orderedCommunities = [...communities].sort((a, b) => {
    if (a.id === b.id) return 0;
    const aOrder = communityOrder[a.id] ?? Number.MAX_SAFE_INTEGER;
    const bOrder = communityOrder[b.id] ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
  if (orderedCommunities.length <= 1) return null;

  const columnCount = Math.max(orderedCommunities.length, 1);
  const useCompactLabels = orderedCommunities.length > 2;

  return (
    <div className="rounded-xl border border-[#1A211A] p-1 bg-[#0B0F0C]">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {orderedCommunities.map((community) => {
          const isActive = community.id === activeCommunityId;
          return (
            <button
              key={community.id}
              type="button"
              onClick={() => {
                if (locked) return;
                switchCommunity(community.id);
              }}
              disabled={locked}
              aria-disabled={locked}
              title={community.name}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                  : locked
                    ? 'text-[#6E786F] cursor-not-allowed'
                    : 'text-[#A9B5AA] hover:text-[#F6FFF2] hover:bg-[#1A211A]'
              }`}
            >
              {useCompactLabels ? community.shortName : community.name}
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="mt-2 px-2 text-[11px] text-[#A9B5AA]">
          {lockedMessage ?? 'Pool selection is locked during signup. Close enrollment to switch spaces.'}
        </p>
      )}
    </div>
  );
};

export default AuthPoolTabs;
