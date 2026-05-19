import { useEffect, useState } from 'react';
import { supabase } from '../db/supabase';

export function useChildAuditLog(childId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!childId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const fetchAuditLog = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('child_audit_log')
          .select('*')
          .eq('child_id', childId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setLogs(data || []);
      } catch (err) {
        setError(err.message);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`child_audit_${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'child_audit_log',
          filter: `child_id=eq.${childId}`
        },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [childId]);

  return { logs, loading, error };
}
