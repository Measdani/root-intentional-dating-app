import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  COMMUNITY_LIST,
  getCommunityDefinition,
  persistActiveCommunityId,
  COMMUNITY_QUERY_PARAM,
} from './communities';
import { setStorageNamespaceCommunity } from './storageNamespace';
import type { CommunityDefinition, CommunityId } from './types';

interface CommunityContextValue {
  activeCommunityId: CommunityId;
  activeCommunity: CommunityDefinition;
  communities: CommunityDefinition[];
  switchCommunity: (communityId: CommunityId) => void;
}

const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);

interface CommunityProviderProps {
  children: React.ReactNode;
  initialCommunityId: CommunityId;
}

export const CommunityProvider: React.FC<CommunityProviderProps> = ({
  children,
  initialCommunityId,
}) => {
  const [activeCommunityId, setActiveCommunityId] = useState<CommunityId>(initialCommunityId);
  const activeCommunity = getCommunityDefinition(activeCommunityId);

  useEffect(() => {
    persistActiveCommunityId(activeCommunityId);
    setStorageNamespaceCommunity(activeCommunityId);

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set(COMMUNITY_QUERY_PARAM, activeCommunityId);
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }
  }, [activeCommunityId]);

  const switchCommunity = useCallback((communityId: CommunityId) => {
    if (communityId === activeCommunityId) return;

    // Update namespace immediately so subsequent auth/session writes go to the selected pool.
    setStorageNamespaceCommunity(communityId);
    setActiveCommunityId(communityId);
  }, [activeCommunityId]);

  const value = useMemo<CommunityContextValue>(
    () => ({
      activeCommunityId,
      activeCommunity,
      communities: COMMUNITY_LIST,
      switchCommunity,
    }),
    [activeCommunity, activeCommunityId, switchCommunity]
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
};

export const useCommunity = (): CommunityContextValue => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
