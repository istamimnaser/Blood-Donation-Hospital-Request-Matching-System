export function IconBadge({ children }) {
  return <span className="icon-badge">{children}</span>;
}

const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function DropletIcon() {
  return (
    <svg {...common}>
      <path d="M12 3c3.5 4 6 7.4 6 10.5a6 6 0 1 1-12 0C6 10.4 8.5 7 12 3Z" />
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg {...common}>
      <path d="M4 21V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15" />
      <path d="M14 10h5a1 1 0 0 1 1 1v10" />
      <path d="M9 8h.01M9 12h.01M9 16h.01" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...common}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg {...common}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2.5 23 21H1L12 2.5Z" />
      <rect x="11" y="9.5" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="12" cy="17.5" r="1.15" fill="#fff" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg {...common}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4.5H7.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

const URGENCY_CLASS = { low: 'badge-neutral', medium: 'badge-warning', high: 'badge-warning', emergency: 'badge-danger' };

export function UrgencyBadge({ urgency }) {
  return (
    <span className={`badge ${URGENCY_CLASS[urgency] || 'badge-neutral'}`}>
      {urgency === 'emergency' && <AlertIcon />}
      {urgency}
    </span>
  );
}
