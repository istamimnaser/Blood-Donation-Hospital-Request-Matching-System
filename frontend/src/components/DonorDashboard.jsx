import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Bell, Droplet } from 'lucide-react';
import { api, donorApi, matchApi } from '../api.js';
import { IconBadge, DropletIcon, CalendarIcon, BellIcon, UrgencyBadge } from './Icon.jsx';
import StatCard, { StatsStrip } from './StatCard.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const matchBadge = { suggested: 'neutral', accepted: 'warning', completed: 'success', declined: 'destructive' };

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [me, loc, mine] = await Promise.all([donorApi.me(), api.locations(), matchApi.mine()]);
      setProfile(me);
      setLocations(loc);
      setMatches(mine);
      setEditForm({
        location_id: me.location_id,
        last_donation_date: me.last_donation_date ? me.last_donation_date.slice(0, 10) : '',
        phone: me.phone,
        is_available: me.is_available,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      const updated = await donorApi.updateMe({
        ...editForm,
        location_id: Number(editForm.location_id),
        last_donation_date: editForm.last_donation_date || null,
      });
      setProfile(updated);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function respond(matchId, status) {
    try {
      await matchApi.respond(matchId, status);
      toast.success(`Match ${status}.`);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading || !profile || !editForm) return <p className="text-muted-foreground">Loading...</p>;

  const completedCount = matches.filter((m) => m.match_status === 'completed').length;
  const pendingCount = matches.filter((m) => m.match_status === 'suggested').length;

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">Donor</span>
        <h2 className="text-2xl font-bold">My dashboard</h2>
      </div>

      <StatsStrip>
        <StatCard icon={<Droplet />} label="Total matches" value={matches.length} />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={completedCount} />
        <StatCard icon={<Bell />} label="Awaiting response" value={pendingCount} />
      </StatsStrip>

      <Card className="mb-6 gap-3 border-none bg-gradient-to-br from-brand-navy to-brand-accent-dark py-5 text-white shadow-md">
        <CardContent className="px-5">
          <div className="mb-3 flex items-center gap-3">
            <IconBadge>
              <DropletIcon />
            </IconBadge>
            <h3 className="text-lg font-bold">{profile.full_name}</h3>
          </div>
          <p className="text-sm text-white/75">
            {profile.email} &middot; {profile.blood_group} &middot; {profile.city} - {profile.area}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <Badge variant={profile.is_available ? 'success' : 'neutral'}>
              {profile.is_available ? 'Available' : 'Unavailable'}
            </Badge>
            Last donation: {profile.last_donation_date ? profile.last_donation_date.slice(0, 10) : 'never'}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6 gap-3 py-5">
        <CardContent className="px-5">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge>
              <CalendarIcon />
            </IconBadge>
            <h3 className="text-lg font-bold">Update availability, location, and last donation</h3>
          </div>
          <form className="flex flex-wrap items-center gap-3" onSubmit={handleSave}>
            <Input
              placeholder="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
              className="w-auto"
            />
            <Select
              value={String(editForm.location_id)}
              onValueChange={(v) => setEditForm({ ...editForm, location_id: v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.location_id} value={String(l.location_id)}>
                    {l.city} - {l.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Last donation date:
              <Input
                type="date"
                value={editForm.last_donation_date}
                onChange={(e) => setEditForm({ ...editForm, last_donation_date: e.target.value })}
                className="w-auto"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={editForm.is_available}
                onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
                className="size-4 accent-primary"
              />
              Available to donate
            </label>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-3">
        <IconBadge>
          <BellIcon />
        </IconBadge>
        <h3 className="text-lg font-bold">My matches</h3>
      </div>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Hospital</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched at</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.match_id}>
                  <TableCell>{m.hospital_name}</TableCell>
                  <TableCell>{m.blood_group}</TableCell>
                  <TableCell><UrgencyBadge urgency={m.urgency} /></TableCell>
                  <TableCell>
                    <Badge variant={matchBadge[m.match_status] || 'neutral'}>{m.match_status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(m.matched_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {m.match_status === 'suggested' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respond(m.match_id, 'accepted')}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => respond(m.match_id, 'declined')}>Decline</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
