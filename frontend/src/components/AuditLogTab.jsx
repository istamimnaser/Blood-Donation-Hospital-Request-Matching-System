import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { api } from '../api.js';
import { Button } from './ui/button.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.jsx';

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setLogs(await api.auditLogs());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes logged yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Table</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Old</TableHead>
                <TableHead>New</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.audit_id}>
                  <TableCell>{l.table_name}</TableCell>
                  <TableCell>{l.record_id}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell className="max-w-[260px] overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap text-muted-foreground">
                    {l.old_data ? JSON.stringify(l.old_data) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[260px] overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap text-muted-foreground">
                    {l.new_data ? JSON.stringify(l.new_data) : '-'}
                  </TableCell>
                  <TableCell>{new Date(l.changed_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
