import React from 'react';
import { Card } from './atoms/Card';

export const DebugInfo: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Only show in development
  if (import.meta.env.PROD) return null;
  
  return (
    <Card className="mb-4 bg-yellow-50 border-yellow-200">
      <h3 className="font-medium text-yellow-800 mb-2">Debug Info (Development Only)</h3>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>Supabase URL: {supabaseUrl ? '✅ Set' : '❌ Missing'}</div>
        <div>Supabase Anon Key: {supabaseAnonKey ? '✅ Set' : '❌ Missing'}</div>
        <div>Environment: {import.meta.env.MODE}</div>
      </div>
      {(!supabaseUrl || !supabaseAnonKey) && (
        <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
          <strong>Missing Environment Variables!</strong><br/>
          Please set up your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      )}
    </Card>
  );
};