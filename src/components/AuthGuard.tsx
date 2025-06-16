import React from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'colaborador' | 'cliente';
}

// MVP: Simplified AuthGuard that always allows access
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  return <>{children}</>;
};