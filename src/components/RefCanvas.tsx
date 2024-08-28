import React, { createContext, useContext, useRef } from "react";
import * as fabric from "fabric"; // v6

interface RefContextProps {
  fabricRef: React.RefObject<fabric.Canvas | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const RefCanvas = createContext<RefContextProps | undefined>(undefined);

export const useRefContext = () => {
  const context = useContext(RefCanvas);
  if (!context) {
    throw new Error("useRefContext must be used within a RefProvider");
  }
  return context;
};

export const RefProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <RefCanvas.Provider value={{ fabricRef, canvasRef }}>
      {children}
    </RefCanvas.Provider>
  );
};
