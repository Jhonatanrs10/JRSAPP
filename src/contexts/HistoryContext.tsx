import React, { createContext, useState, ReactNode, useContext } from 'react';

type Item = {
  unitValue: number;
  quantity: number;
};

type HistoryContextType = {
  history: Item[];
  addItem: (item: Item) => void;
};

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Item[]>([]);

  const addItem = (item: Item) => {
    setHistory((prev) => [...prev, item]);
  };

  return (
    <HistoryContext.Provider value={{ history, addItem }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
