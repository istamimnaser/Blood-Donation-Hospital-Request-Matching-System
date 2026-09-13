import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Droplet, Minus } from 'lucide-react';
import { api } from '../api.js';
import { Card, CardContent } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './ui/select.jsx';

const GROUP_ORDER = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function CompatibilityTab() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('O+');

  useEffect(() => {
    api
      .bloodCompatibility()
      .then(setPairs)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const compatible = useMemo(() => {
    const set = new Set(pairs.map((p) => `${p.donor_group}|${p.recipient_group}`));
    return (donor, recipient) => set.has(`${donor}|${recipient}`);
  }, [pairs]);

  const canDonateTo = useMemo(
    () => GROUP_ORDER.filter((g) => compatible(selected, g)),
    [compatible, selected]
  );
  const canReceiveFrom = useMemo(
    () => GROUP_ORDER.filter((g) => compatible(g, selected)),
    [compatible, selected]
  );

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Blood Group Compatibility</h2>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card className="mb-6 gap-3 py-5">
            <CardContent className="px-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Blood group
                </span>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-bold text-muted-foreground">
                    Can donate to
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {canDonateTo.map((g) => (
                      <Badge key={g} variant="success">
                        <Droplet /> {g}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold text-muted-foreground">
                    Can receive from
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {canReceiveFrom.map((g) => (
                      <Badge key={g} variant="success">
                        <Droplet /> {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 py-5">
            <CardContent className="px-5">
              <h3 className="mb-3 text-lg font-bold">
                Donor &rarr; recipient chart
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Rows are the donor's group, columns are the recipient's group.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-xs font-bold text-muted-foreground">
                        Donor \ Recipient
                      </th>
                      {GROUP_ORDER.map((g) => (
                        <th
                          key={g}
                          className="p-2 text-center text-xs font-bold text-muted-foreground"
                        >
                          {g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GROUP_ORDER.map((donorGroup) => (
                      <tr key={donorGroup} className="border-t">
                        <th className="p-2 text-left text-xs font-bold text-muted-foreground">
                          {donorGroup}
                        </th>
                        {GROUP_ORDER.map((recipientGroup) => {
                          const ok = compatible(donorGroup, recipientGroup);
                          const isSelectedRow =
                            donorGroup === selected || recipientGroup === selected;
                          return (
                            <td
                              key={recipientGroup}
                              className={`p-2 text-center ${
                                isSelectedRow ? 'bg-muted/40' : ''
                              }`}
                            >
                              {ok ? (
                                <Check className="mx-auto size-4 text-[#1f9d6c]" />
                              ) : (
                                <Minus className="mx-auto size-4 text-muted-foreground/30" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
