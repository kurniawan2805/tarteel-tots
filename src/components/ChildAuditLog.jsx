import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { useChildAuditLog } from '../hooks/useChildAuditLog';

export default function ChildAuditLog({ childId }) {
  const { logs, loading } = useChildAuditLog(childId);
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  const getParentName = (profileId) => {
    if (!profiles) return 'Unknown';
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || 'Unknown Parent';
  };

  const getFieldLabel = (field) => {
    const labels = {
      name: '👤 Name',
      age: '🎂 Age',
      avatar: '🎨 Avatar',
      daily_goal_minutes: '⏱️ Daily Goal',
      memorization_baseline: '📖 Memorization Baseline'
    };
    return labels[field] || field;
  };

  const formatValue = (value) => {
    if (!value) return 'Not set';
    if (value.length > 50) return value.substring(0, 47) + '...';
    return value;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-muted">Loading audit log...</p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-muted">No changes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-3 rounded-lg bg-bg-secondary border border-border transition-all hover:border-primary hover:bg-opacity-50"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-sm text-text">
                {getFieldLabel(log.field_name)}
              </p>
              <p className="text-xs text-text-muted">
                by {getParentName(log.changed_by)} •{' '}
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {log.old_value && (
              <div className="text-xs text-text-muted">
                <span className="text-danger">−</span>{' '}
                <code className="bg-danger bg-opacity-10 px-2 py-1 rounded text-danger font-mono">
                  {formatValue(log.old_value)}
                </code>
              </div>
            )}
            {log.new_value && (
              <div className="text-xs text-text-muted">
                <span className="text-primary">+</span>{' '}
                <code className="bg-primary bg-opacity-10 px-2 py-1 rounded text-primary font-mono">
                  {formatValue(log.new_value)}
                </code>
              </div>
            )}
          </div>

          {log.change_reason && (
            <p className="text-xs text-text-muted italic mt-2">
              Reason: {log.change_reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
