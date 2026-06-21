import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile } from '@/types';

interface AppContextType {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const defaultUser: UserProfile = {
  id: 'u001',
  name: '林德华',
  avatar: 'https://picsum.photos/id/1005/200/200',
  department: '产品研发中心',
  role: '高级项目经理',
  phone: '138****6688',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <AppContext.Provider value={{ user, setUser, refreshKey, triggerRefresh }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
