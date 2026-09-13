import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, donorRequestApi } from '../api.js';
import { IconBadge, UrgencyBadge } from './Icon.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const emptyForm = { blood_group_id: '', units_needed: 1, urgency: 'medium', reason: '' };
const statusBadge = { pending: 'warning', accepted: 'success', fulfilled: 'success', cancelled: 'neutral' };

function DonorView() {
  const [bloodGroups, setBloodGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [communityNotifications, setCommunityNotifications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [bg, mine, notes] = await Promise.all([
        api.bloodGroups(),
        donorRequestApi.mine(),
        api.notifications(),
      ]);
      setBloodGroups(bg);
      setRequests(mine);
      setCommunityNotifications(notes.filter((n) => n.donor_request_id));
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
      });
      setForm(emptyForm);
      toast.success('Request broadcast to hospitals.');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Card className="mb-6 gap-3 py-5">
        <CardContent className="px-5">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge>
              <Megaphone />
            </IconBadge>
            <h3 className="text-lg font-bold">Broadcast a request</h3>
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
            <Button type="submit">Broadcast request</Button>
          </form>
        </CardContent>
      </Card>

      {communityNotifications.length > 0 && (
        <Card className="mb-6 gap-3 border-none bg-gradient-to-br from-brand-navy to-brand-accent-dark py-5 text-white shadow-md">
          <CardContent className="px-5">
            <div className="mb-3 flex items-center gap-3">
              <IconBadge>
                <Megaphone />
              </IconBadge>
              <h3 className="text-lg font-bold">Community responses</h3>
            </div>
            <ul className="space-y-2 text-sm text-white/85">
              {communityNotifications.map((n) => (
                <li key={n.notification_id}>{n.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h3 className="mb-3 text-lg font-bold">My community requests</h3>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't broadcast any requests yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Blood group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accepted by</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.donor_request_id}>
                  <TableCell>{r.blood_group}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={r.urgency} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[r.status] || 'neutral'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.accepted_by_hospital || '-'}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

function HospitalView() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRequests(await donorRequestApi.open());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(donorRequestId, status) {
    try {
      await donorRequestApi.respond(donorRequestId, status);
      toast.success(status === 'accepted' ? 'Accepted -- the donor has been notified.' : 'Declined.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <h3 className="mb-3 text-lg font-bold">Open community requests</h3>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open requests right now.</p>
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
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.donor_request_id}>
                  <TableCell>{r.donor_name}</TableCell>
                  <TableCell>{r.blood_group}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={r.urgency} />
                  </TableCell>
                  <TableCell className="whitespace-normal">{r.reason || '-'}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(r.donor_request_id, 'accepted')}>
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respond(r.donor_request_id, 'declined')}
                      >
                        Decline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

export default function CommunityRequestsTab() {
  const { role } = useAuth();

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">
          Community
        </span>
        <h2 className="text-2xl font-bold">Community Requests</h2>
      </div>
      {role === 'donor' ? <DonorView /> : <HospitalView />}
    </section>
  );
}
