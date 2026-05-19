import * as React from "react";

type AccessLevel = "localhost" | "network";

export const AccessContext = React.createContext<{ accessLevel: AccessLevel; isLocalhost: boolean }>({
  accessLevel: "network",
  isLocalhost: false,
});

export const AccessProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessLevel, setAccessLevel] = React.useState<AccessLevel>("network");

  React.useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    setAccessLevel(isLocalhost ? "localhost" : "network");
  }, []);

  return (
    <AccessContext.Provider value={{ accessLevel, isLocalhost: accessLevel === "localhost" }}>
      {children}
    </AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = React.useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within AccessProvider");
  }
  return context;
};
