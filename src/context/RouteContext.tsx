import React, {createContext, useContext, useState} from 'react';

type Location = {name: string; lat: number; lon: number} | null;

type RouteContextType = {
  start: Location;
  end: Location;
  setStart: (loc: Location) => void;
  setEnd: (loc: Location) => void;
  resetRoute: () => void;
};

const RouteContext = createContext<RouteContextType | null>(null);

export const RouteProvider = ({children}: {children: React.ReactNode}) => {
  const [start, setStart] = useState<Location>(null);
  const [end, setEnd] = useState<Location>(null);

  const resetRoute = () => {
    setStart(null);
    setEnd(null);
  };

  return (
    <RouteContext.Provider value={{start, end, setStart, setEnd, resetRoute}}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteData = () => {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    throw new Error('useRouteData must be used within RouteProvider');
  }
  return ctx;
};
