import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useConfig = () => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*');

      if (error) throw error;

      const configMap = data.reduce((acc, item) => {
        acc[item.key] = item.valor;
        return acc;
      }, {} as Record<string, string>);

      setConfig(configMap);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, valor: string) => {
    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert([{ key, valor }], { onConflict: 'key' });

      if (error) throw error;

      setConfig(prev => ({ ...prev, [key]: valor }));
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  const getConfig = (key: string, defaultValue: string = ''): string => {
    return config[key] || defaultValue;
  };

  return {
    config,
    loading,
    updateConfig,
    getConfig,
    refreshConfig: fetchConfig,
  };
};