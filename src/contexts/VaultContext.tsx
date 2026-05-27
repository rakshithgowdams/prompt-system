import { createContext, useContext, useState, type ReactNode } from 'react';

interface VaultContextValue {
  masterPassword: string | null;
  setMasterPassword: (mp: string | null) => void;
  isUnlocked: boolean;
  lockVault: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [masterPassword, setMasterPassword] = useState<string | null>(null);

  const lockVault = () => setMasterPassword(null);

  return (
    <VaultContext.Provider value={{
      masterPassword,
      setMasterPassword,
      isUnlocked: !!masterPassword,
      lockVault,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside VaultProvider');
  return ctx;
}
