import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, hospitalApi, bloodbankApi } from '../api.js';
import { IconBadge, DropletIcon } from './Icon.jsx';
import StatCard, { StatsStrip } from './StatCard.jsx';
import { Card, CardContent } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const emptyAddForm = { blood_group_id: '', units: 1, note: '' };
const emptyWithdrawForm = { blood_group_id: '', units: 1, request_id: '', note: '' };

// A hospital's own blood bank -- a standalone management page, separate
// from the request/matching dashboard. Stock fills up automatically
// whenever sp_record_donation is called against a request
// (trg_bloodbank_add_from_donation), or manually here, and only drains
// through an explicit withdrawal tied to one of the hospital's own
// requests -- see db/schema/05_bloodbank.sql.
export default function BloodBankTab() {
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [withdrawForm, setWithdrawForm] = useState(emptyWithdrawForm);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, t, r, bg] = await Promise.all([
        bloodbankApi.mine(),
        bloodbankApi.transactions(),
        hospitalApi.myRequests(),
        api.bloodGroups(),
      ]);
      setStock(s);
      setTransactions(t);
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

  async function handleAddStock(e) {
    e.preventDefault();
    if (!addForm.blood_group_id) {
      toast.error('Please choose a blood group.');
      return;
    }
    try {
      await bloodbankApi.addStock({
        blood_group_id: Number(addForm.blood_group_id),
        units: Number(addForm.units),
        note: addForm.note || null,
      });
      toast.success('Stock added.');
      setAddForm(emptyAddForm);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    if (!withdrawForm.blood_group_id || !withdrawForm.request_id) {
      toast.error('Please choose a blood group and a request.');
      return;
    }
    try {
      await bloodbankApi.withdraw({
        blood_group_id: Number(withdrawForm.blood_group_id),
        units: Number(withdrawForm.units),
        request_id: Number(withdrawForm.request_id),
        note: withdrawForm.note || null,
      });
      toast.success('Stock withdrawn for the request.');
      setWithdrawForm(emptyWithdrawForm);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const totalUnits = stock.reduce((sum, s) => sum + s.units_available, 0);
  const groupsInStock = stock.length;
  const totalWithdrawn = transactions
    .filter((t) => t.transaction_type === 'withdrawal')
    .reduce((sum, t) => sum + t.units, 0);

  return (
    <section>
      <div className="mb-6">
        <span className="mb-1 block text-xs font-bold tracking-widest text-brand-accent-dark uppercase">Hospital</span>
        <h2 className="text-2xl font-bold">Blood bank</h2>
      </div>

      <StatsStrip>
        <StatCard icon={<DropletIcon />} label="Units in stock" value={totalUnits} />
        <StatCard icon={<DropletIcon />} label="Blood groups stocked" value={groupsInStock} />
        <StatCard icon={<DropletIcon />} label="Units withdrawn (all time)" value={totalWithdrawn} />
      </StatsStrip>

      <Card className="mb-6 gap-3 py-5">
        <CardContent className="px-5">
          <div className="mb-4 flex items-center gap-3">
            <IconBadge>
              <DropletIcon />
            </IconBadge>
            <h3 className="text-lg font-bold">Current inventory</h3>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : stock.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">
              No stock yet -- add some below, or record a donation against a request.
            </p>
          ) : (
            <div className="mb-4 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Blood group</TableHead>
                    <TableHead>Units available</TableHead>
                    <TableHead>Last updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s) => (
                    <TableRow key={s.stock_id}>
                      <TableCell>{s.blood_group}</TableCell>
                      <TableCell>{s.units_available}</TableCell>
                      <TableCell>{new Date(s.updated_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Add stock</h4>
              <form className="flex flex-wrap items-center gap-2" onSubmit={handleAddStock}>
                <Select value={addForm.blood_group_id} onValueChange={(v) => setAddForm({ ...addForm, blood_group_id: v })}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Group" />
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
                  placeholder="Units"
                  value={addForm.units}
                  onChange={(e) => setAddForm({ ...addForm, units: e.target.value })}
                  required
                  className="w-20"
                />
                <Input
                  placeholder="Note (optional)"
                  value={addForm.note}
                  onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  className="w-36"
                />
                <Button type="submit" size="sm" variant="outline">Add stock</Button>
              </form>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Use stock for a request</h4>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create a request first.</p>
              ) : (
                <form className="flex flex-wrap items-center gap-2" onSubmit={handleWithdraw}>
                  <Select
                    value={withdrawForm.request_id}
                    onValueChange={(v) => setWithdrawForm({ ...withdrawForm, request_id: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Request" />
                    </SelectTrigger>
                    <SelectContent>
                      {requests.map((r) => (
                        <SelectItem key={r.request_id} value={String(r.request_id)}>
                          #{r.request_id} -- {r.blood_group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={withdrawForm.blood_group_id}
                    onValueChange={(v) => setWithdrawForm({ ...withdrawForm, blood_group_id: v })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Group" />
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
                    placeholder="Units"
                    value={withdrawForm.units}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, units: e.target.value })}
                    required
                    className="w-20"
                  />
                  <Button type="submit" size="sm">Withdraw</Button>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-5">
        <CardContent className="px-5">
          <h3 className="mb-3 text-lg font-bold">Transaction history</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movements yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Type</TableHead>
                    <TableHead>Blood group</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.transaction_id}>
                      <TableCell>
                        <Badge variant={t.transaction_type === 'withdrawal' ? 'destructive' : 'success'}>
                          {t.transaction_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.blood_group}</TableCell>
                      <TableCell>{t.transaction_type === 'withdrawal' ? '-' : '+'}{t.units}</TableCell>
                      <TableCell>{t.request_id ? `#${t.request_id}` : '--'}</TableCell>
                      <TableCell>{t.note || '--'}</TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
