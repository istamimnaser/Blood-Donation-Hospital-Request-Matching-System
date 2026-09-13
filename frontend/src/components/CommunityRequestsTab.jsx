import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, donorRequestApi } from '../api.js';
import { IconBadge, DropletIcon, UrgencyBadge } from './Icon.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const emptyForm = { blood_group_id: '', units_needed: 1, urgency: 'medium', reason: '' };

const statusBadge = { pending: 'warning', accepted: 'success', fulfilled: 'success', cancelled: 'neutral' };

export default function CommunityRequestsTab() {
  const { role } = useAuth();
  return role === 'hospital' ? <HospitalCommunityView /> : <DonorCommunityView />;
}

function DonorCommunityView() {
  const [bloodGroups, setBloodGroups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [mine, setMine] = useState([]);
  const [communityUpdates, setCommunityUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [bg, requests, notifications] = await Promise.all([
        api.bloodGroups(),
        donorRequestApi.mine(),
        api.notifications(),
      ]);
      setBloodGroups(bg);
      setMine(requests);
      setCommunityUpdates(notifications.filter((n) => n.notification_type === 'donor_request_response'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.blood_group_id) {
      toast.error('Please choose a blood group.');
      return;
    }
    try {
      await donorRequestApi.create({
        ...form,
        blood_group_id: Number(form.blood_group_id),
        units_needed: Number(form.units_needed),
        reason: form.reason || null,
      });
      toast.success('Request posted. Hospitals have been notified.');
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">Community</span>
        <h2 className="text-2xl font-bold">Ask the community for blood</h2>
      </div>

      {communityUpdates.length > 0 && (
        <Card className="mb-6 gap-2 border-none bg-gradient-to-br from-brand-navy to-brand-accent-dark py-4 text-white shadow-md">
          <CardContent className="px-5">
            <div className="mb-2 flex items-center gap-3">
              <IconBadge>
                <Bell />
              </IconBadge>
              <h3 className="text-sm font-bold tracking-wide uppercase">Community updates</h3>
            </div>
            <ul className="space-y-1 text-sm text-white/90">
              {communityUpdates.map((n) => (
                <li key={n.notification_id}>{n.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 gap-3 py-5">
        <CardContent className="px-5">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge>
              <DropletIcon />
            </IconBadge>
            <h3 className="text-lg font-bold">Post a request</h3>
          </div>
          <form className="flex flex-wrap items-center gap-3" onSubmit={handleSubmit}>
            <Select value={form.blood_group_id} onValueChange={(v) => setForm({ ...form, blood_group_id: v })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Blood group needed" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((bg) => (
                  <SelectItem key={bg.blood_group_id} value={String(bg.blood_group_id)}>
                    {bg.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              placeholder="Units needed"
              value={form.units_needed}
              onChange={(e) => setForm({ ...form, units_needed: e.target.value })}
              required
              className="w-36"
            />
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
                <SelectItem value="emergency">emergency</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Reason (optional)"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-64"
            />
            <Button type="submit">Post request</Button>
          </form>
        </CardContent>
      </Card>

      <h3 className="mb-3 text-lg font-bold">My requests</h3>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't posted any requests yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Blood group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((r) => (
                <TableRow key={r.donor_request_id}>
                  <TableCell>{r.blood_group}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={r.urgency} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[r.status] || 'neutral'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.accepted_hospital_name || '--'}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function HospitalCommunityView() {
  const [bloodGroups, setBloodGroups] = useState([]);
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [open, setOpen] = useState([]);
  const [communityUpdates, setCommunityUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll(filter) {
    setLoading(true);
    try {
      const [bg, requests, notifications] = await Promise.all([
        api.bloodGroups(),
        donorRequestApi.open(filter && filter !== 'all' ? filter : null),
        api.notifications(),
      ]);
      setBloodGroups(bg);
      setOpen(requests);
      setCommunityUpdates(notifications.filter((n) => n.notification_type === 'donor_request_created'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(bloodGroupFilter);
  }, [bloodGroupFilter]);

  async function respond(id, status) {
    try {
      await donorRequestApi.respond(id, status);
      toast.success(`Request ${status}.`);
      loadAll(bloodGroupFilter);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">Community</span>
        <h2 className="text-2xl font-bold">Donors asking for help</h2>
      </div>

      {communityUpdates.length > 0 && (
        <Card className="mb-6 gap-2 border-none bg-gradient-to-br from-brand-navy to-brand-accent-dark py-4 text-white shadow-md">
          <CardContent className="px-5">
            <div className="mb-2 flex items-center gap-3">
              <IconBadge>
                <Bell />
              </IconBadge>
              <h3 className="text-sm font-bold tracking-wide uppercase">Community updates</h3>
            </div>
            <ul className="space-y-1 text-sm text-white/90">
              {communityUpdates.map((n) => (
                <li key={n.notification_id}>{n.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by blood group:</span>
        <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {bloodGroups.map((bg) => (
              <SelectItem key={bg.blood_group_id} value={String(bg.blood_group_id)}>
                {bg.group_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : open.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open community requests right now.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Donor</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((r) => (
                <TableRow key={r.donor_request_id}>
                  <TableCell>{r.donor_name}</TableCell>
                  <TableCell>{r.blood_group}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={r.urgency} />
                  </TableCell>
                  <TableCell className="whitespace-normal">{r.reason || '--'}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(r.donor_request_id, 'accepted')}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => respond(r.donor_request_id, 'declined')}>Decline</Button>
                    </div>
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
