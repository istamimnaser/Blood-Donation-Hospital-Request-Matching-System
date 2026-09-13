import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, CheckCheck, ChevronDown } from 'lucide-react';
import { api } from '../api.js';
import { Button } from './ui/button.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import { IconBadge, BellIcon, UrgencyBadge, NOTIFICATION_ICON } from './Icon.jsx';

function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setNotifications(await api.notifications());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      toast.error(err.message);
      setNotifications(previous);
    }
  }

  function toggleExpand(n) {
    const opening = expandedId !== n.notification_id;
    setExpandedId(opening ? n.notification_id : null);
    if (opening && !n.is_read) markRead(n.notification_id);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Notifications</h2>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck /> Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = NOTIFICATION_ICON[n.notification_type] || BellIcon;
            const expanded = expandedId === n.notification_id;
            const hasDetails = n.hospital_name || n.donor_name || n.blood_group;
            return (
              <Card
                key={n.notification_id}
                className={`gap-0 overflow-hidden py-0 transition-colors ${
                  n.is_read ? 'border-transparent bg-transparent shadow-none' : 'border-primary/20 bg-primary/5 shadow-sm'
                }`}
              >
                <CardContent
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(n)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleExpand(n)}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3"
                >
                  <IconBadge variant={n.is_read ? 'muted' : 'default'}>
                    <Icon />
                  </IconBadge>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.is_read ? 'text-muted-foreground' : 'font-semibold'}`}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.recipient_type} &middot; {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.notification_id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                  <ChevronDown
                    className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </CardContent>

                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    {hasDetails ? (
                      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {n.hospital_name && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Hospital</dt>
                            <dd className="font-medium">{n.hospital_name}</dd>
                          </div>
                        )}
                        {n.donor_name && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Donor</dt>
                            <dd className="font-medium">{n.donor_name}</dd>
                          </div>
                        )}
                        {n.blood_group && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Blood group</dt>
                            <dd className="font-medium">{n.blood_group}</dd>
                          </div>
                        )}
                        {n.units_needed && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Units</dt>
                            <dd className="font-medium">{n.units_needed}</dd>
                          </div>
                        )}
                        {n.urgency && (
                          <div>
                            <dt className="mb-0.5 text-xs text-muted-foreground">Urgency</dt>
                            <dd><UrgencyBadge urgency={n.urgency} /></dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">No additional details for this notification.</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
