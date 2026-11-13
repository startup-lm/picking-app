import React, { createContext, useContext } from 'react';
import type { UserProfile } from './session';

export type SessionContextType = {
  profile: UserProfile | null;
};

export const SessionContext = createContext<SessionContextType>({
  profile: null,
});

export function useSession() {
  return useContext(SessionContext);
}
