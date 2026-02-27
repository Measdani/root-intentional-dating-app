export type CommunityId = 'rooted' | 'lgbtq';

export type CommunityMatchingMode = 'opposite-gender' | 'inclusive';

export interface CommunityDefinition {
  id: CommunityId;
  name: string;
  shortName: string;
  heroTitle: string;
  heroTagline: string;
  loginTitle: string;
  loginSubtitle: string;
  signupGenderGuidance: string;
  signupPlatformConfirmation: string;
  matchingMode: CommunityMatchingMode;
}
