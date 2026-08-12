import { Droplet, Building2, Calendar, Bell, TriangleAlert, History } from 'lucide-react';
import { Badge } from './ui/badge.jsx';

export function IconBadge({ children }) {
  return (
    <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent-dark text-white shadow-sm [&>svg]:size-[18px]">
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

const URGENCY_VARIANT = { low: 'neutral', medium: 'warning', high: 'warning', emergency: 'destructive' };

export function UrgencyBadge({ urgency }) {
  return (
    <Badge variant={URGENCY_VARIANT[urgency] || 'neutral'}>
      {urgency === 'emergency' && <TriangleAlert />}
      {urgency}
    </Badge>
  );
}
