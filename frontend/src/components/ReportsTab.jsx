import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { api } from '../api.js';
import { Card, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

const REPORTS = [
  { id: 'pendingEmergency', label: 'Pending emergency requests (v_pending_emergency_requests)' },
  { id: 'donationHistory', label: 'Donation history (v_donation_history)' },
  { id: 'hospitalSummary', label: 'Hospital summary (v_hospital_summary)' },
  { id: 'requestFulfillment', label: 'Request fulfillment (v_request_fulfillment)' },
];

export default function ReportsTab() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [pendingEmergency, donationHistory, hospitalSummary, requestFulfillment] = await Promise.all([
        api.reports.pendingEmergency(),
        api.reports.donationHistory(),
        api.reports.hospitalSummary(),
        api.reports.requestFulfillment(),
      ]);
      setData({ pendingEmergency, donationHistory, hospitalSummary, requestFulfillment });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports</h2>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw /> Refresh reports
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}

      {!loading &&
        REPORTS.map(({ id, label }) => {
          const rows = data[id] || [];
          return (
            <Card className="mb-6 gap-3 py-5" key={id}>
              <CardContent className="px-5">
                <h3 className="mb-3 text-lg font-bold">{label}</h3>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          {Object.keys(rows[0]).map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((val, j) => (
                              <TableCell key={j}>{String(val ?? '-')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
    </section>
  );
}
