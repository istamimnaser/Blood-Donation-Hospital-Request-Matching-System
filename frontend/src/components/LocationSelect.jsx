import { useState } from 'react';

// Dropdown of existing locations with an inline "add new" fallback, since the
// lookup table is small and this is the only place new city/area pairs get added.
export default function LocationSelect({ locations, value, onChange, onCreate }) {
    const [adding, setAdding] = useState(false);
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');

    if (adding) {
        return (
            <div className="location-select-new">
                <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                <input placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} required />
                <button
                    type="button"
                    onClick={async () => {
                        if (!city || !area) return;
                        const created = await onCreate({ city, area });
                        onChange(String(created.location_id));
                        setAdding(false);
                        setCity('');
                        setArea('');
                    }}
                >
                    Save
                </button>
                <button type="button" onClick={() => setAdding(false)}>
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <select
            value={value}
            onChange={(e) => {
                if (e.target.value === '__new__') {
                    setAdding(true);
                } else {
                    onChange(e.target.value);
                }
            }}
            required
        >
            <option value="">Select location</option>
            {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                    {loc.city} - {loc.area}
                </option>
            ))}
            <option value="__new__">+ Add new location</option>
        </select>
    );
}
