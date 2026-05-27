import { createContext, useContext, type ReactNode } from 'react';

interface VaultContextValue {
  // Kept for backwards-compat; vault no longer requires a master password
}

const VaultContext = createContext<VaultContextValue>({});

export function VaultProvider({ children }: { children: ReactNode }) {
  return <VaultContext.Provider value={{}}>{children}</VaultContext.Provider>;
}

export function useVault() {
  return useContext(VaultContext);
}
