import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, CheckCircle2, Clock, Droplet } from 'lucide-react';
import { api, hospitalApi, matchApi } from '../api.js';
import { IconBadge, BuildingIcon, UrgencyBadge } from './Icon.jsx';
import StatCard, { StatsStrip } from './StatCard.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const emptyForm = { blood_group_id: '', units_needed: 1, urgency: 'medium' };
const emptyDonation = { donor_id: '', units_donated: 1, donation_date: '' };

const statusBadge = {
  pending: 'warning',
  partially_fulfilled: 'warning',
  fulfilled: 'success',
  cancelled: 'neutral',
};
const matchBadge = { suggested: 'neutral', accepted: 'warning', completed: 'success', declined: 'destructive' };

export default function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [matches, setMatches] = useState([]);
  const [donationForm, setDonationForm] = useState(emptyDonation);

  async function loadAll() {
    setLoading(true);
    try {
      const [r, bg] = await Promise.all([hospitalApi.myRequests(), api.bloodGroups()]);
      setRequests(r);
      setBloodGroups(bg);
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
      await hospitalApi.createRequest({
        ...form,
        blood_group_id: Number(form.blood_group_id),
        units_needed: Number(form.units_needed),
      });
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function openRequest(request) {
    setSelectedId(request.request_id);
    setDonationForm(emptyDonation);
    await refreshPanel(request.request_id);
  }

  async function refreshPanel(requestId) {
    try {
      const [e, m] = await Promise.all([hospitalApi.eligibleDonors(requestId), matchApi.forRequest(requestId)]);
      setEligible(e);
      setMatches(m);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function createMatch(donorId) {
    try {
      await matchApi.create({ request_id: selectedId, donor_id: donorId });
      toast.success('Match created. A notification was sent to the donor.');
      refreshPanel(selectedId);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function recordDonation(e) {
    e.preventDefault();
    if (!donationForm.donor_id) {
      toast.error('Please choose a donor.');
      return;
    }
    try {
      await api.recordDonation({
        donor_id: Number(donationForm.donor_id),
        request_id: selectedId,
        units_donated: Number(donationForm.units_donated),
        donation_date: donationForm.donation_date || null,
      });
      toast.success('Donation recorded. Request fulfillment, donor history, and match status all updated.');
      setDonationForm(emptyDonation);
      refreshPanel(selectedId);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const selectedRequest = requests.find((r) => r.request_id === selectedId);
  const acceptedDonors = matches.filter((m) => m.match_status === 'accepted');

  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;
  const inProgressCount = requests.filter((r) => r.status === 'pending' || r.status === 'partially_fulfilled').length;
  const totalUnitsFulfilled = requests.reduce((sum, r) => sum + r.units_fulfilled, 0);

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">Hospital</span>
        <h2 className="text-2xl font-bold">My requests</h2>
      </div>

      <StatsStrip>
        <StatCard icon={<ClipboardList />} label="Total requests" value={requests.length} />
        <StatCard icon={<Clock />} label="In progress" value={inProgressCount} />
        <StatCard icon={<CheckCircle2 />} label="Fulfilled" value={fulfilledCount} />
        <StatCard icon={<Droplet />} label="Units fulfilled" value={totalUnitsFulfilled} />
      </StatsStrip>

      <Card className="mb-6 gap-3 py-5">
        <CardContent className="px-5">
          <form className="flex flex-wrap items-center gap-3" onSubmit={handleSubmit}>
            <Select value={form.blood_group_id} onValueChange={(v) => setForm({ ...form, blood_group_id: v })}>
              <SelectTrigger className="w-[200px]">
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
            <Button type="submit">Create request</Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>ID</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>Needed / Fulfilled</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.request_id} className={r.request_id === selectedId ? 'bg-primary/5' : ''}>
                  <TableCell>{r.request_id}</TableCell>
                  <TableCell>{r.blood_group}</TableCell>
                  <TableCell>{r.units_fulfilled} / {r.units_needed}</TableCell>
                  <TableCell><UrgencyBadge urgency={r.urgency} /></TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[r.status] || 'neutral'}>{r.status.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openRequest(r)}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedRequest && (
        <Card className="mt-6 gap-3 border-t-4 border-t-primary py-5 shadow-md">
          <CardContent className="px-5">
            <div className="mb-4 flex items-center gap-3">
              <IconBadge>
                <BuildingIcon />
              </IconBadge>
              <h3 className="text-lg font-bold">
                Request #{selectedRequest.request_id} -- {selectedRequest.blood_group}
              </h3>
            </div>

            <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Eligible donors (fn_eligible_donors)
            </h4>
            {eligible.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                No eligible donors found (compatible group, available, 90+ days since last donation).
              </p>
            ) : (
              <div className="mb-4 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Donor</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Same location</TableHead>
                      <TableHead>Exact group</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligible.map((d) => (
                      <TableRow key={d.donor_id}>
                        <TableCell>{d.full_name}</TableCell>
                        <TableCell>{d.blood_group}</TableCell>
                        <TableCell>{d.city} - {d.area}</TableCell>
                        <TableCell>
                          <Badge variant={d.same_location ? 'success' : 'neutral'}>{d.same_location ? 'Yes' : 'No'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.exact_blood_group ? 'success' : 'neutral'}>{d.exact_blood_group ? 'Yes' : 'No'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => createMatch(d.donor_id)}>Suggest match</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Matches (request_matches)
            </h4>
            {matches.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">No donors matched yet.</p>
            ) : (
              <div className="mb-4 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Donor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Matched at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((m) => (
                      <TableRow key={m.match_id}>
                        <TableCell>{m.donor_name}</TableCell>
                        <TableCell>
                          <Badge variant={matchBadge[m.match_status] || 'neutral'}>{m.match_status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(m.matched_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Record a donation (sp_record_donation)
            </h4>
            {acceptedDonors.length === 0 ? (
              <p className="text-sm text-muted-foreground">A donor needs to accept a match before you can record their donation.</p>
            ) : (
              <form className="flex flex-wrap items-center gap-3" onSubmit={recordDonation}>
                <Select
                  value={donationForm.donor_id}
                  onValueChange={(v) => setDonationForm({ ...donationForm, donor_id: v })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptedDonors.map((m) => (
                      <SelectItem key={m.donor_id} value={String(m.donor_id)}>
                        {m.donor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Units donated"
                  value={donationForm.units_donated}
                  onChange={(e) => setDonationForm({ ...donationForm, units_donated: e.target.value })}
                  required
                  className="w-36"
                />
                <Input
                  type="date"
                  value={donationForm.donation_date}
                  onChange={(e) => setDonationForm({ ...donationForm, donation_date: e.target.value })}
                  className="w-auto"
                />
                <Button type="submit">Record donation</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
