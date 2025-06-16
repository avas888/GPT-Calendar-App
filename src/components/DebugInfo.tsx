import React from 'react';
import { Card } from './atoms/Card';

export const DebugInfo: React.FC = () => {
  // Only show in development
  if (import.meta.env.PROD) return null;
  
  return (
    <Card className="mb-4 bg-green-50 border-green-200">
      <h3 className="font-medium text-green-800 mb-2">MVP Development Mode</h3>
      <div className="text-sm text-green-700 space-y-1">
        <div>✅ Authentication bypassed</div>
        <div>✅ All routes accessible</div>
        <div>✅ Mock admin user active</div>
        <div>✅ Supabase navigation disabled</div>
        <div>Environment: {import.meta.env.MODE}</div>
      </div>
      <div className="mt-2 p-2 bg-green-100 rounded text-green-800 text-xs">
        <strong>MVP Mode Active!</strong><br/>
        All authentication and role restrictions have been bypassed for development.
      </div>
    </Card>
  );
};