import { Droplet, Building2, Calendar, Bell, TriangleAlert, History, Megaphone, HeartHandshake } from 'lucide-react';
import { Badge } from './ui/badge.jsx';

export function IconBadge({ children, variant = 'default' }) {
  const variantClass =
    variant === 'muted'
      ? 'bg-muted text-muted-foreground'
      : 'bg-gradient-to-br from-brand-accent to-brand-accent-dark text-white';
  return (
    <span
      className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg shadow-sm [&>svg]:size-[18px] ${variantClass}`}
    >
      {children}
    </span>
  );
}

export const DropletIcon = Droplet;
export const BuildingIcon = Building2;
export const CalendarIcon = Calendar;
export const BellIcon = Bell;
export const AlertIcon = TriangleAlert;
export const HistoryIcon = History;
export const MegaphoneIcon = Megaphone;
export const HandshakeIcon = HeartHandshake;

export const NOTIFICATION_ICON = {
  request_created: AlertIcon,
  match_suggested: BellIcon,
  donation_confirmed: DropletIcon,
  donor_request_created: MegaphoneIcon,
  donor_request_response: HandshakeIcon,
};

const URGENCY_VARIANT = { low: 'neutral', medium: 'warning', high: 'warning', emergency: 'destructive' };

export function UrgencyBadge({ urgency }) {
  return (
    <Badge variant={URGENCY_VARIANT[urgency] || 'neutral'}>
      {urgency === 'emergency' && <TriangleAlert />}
      {urgency}
    </Badge>
  );
}
