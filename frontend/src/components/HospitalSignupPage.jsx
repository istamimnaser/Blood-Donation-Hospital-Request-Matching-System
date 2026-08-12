import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from './AuthShell.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  contact_phone: '',
  location_id: '',
};

export default function HospitalSignupPage({ onSwitch }) {
  const { signupHospital } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.locations().then(setLocations).catch((err) => toast.error(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.location_id) {
      toast.error('Please choose a location.');
      return;
    }
    setLoading(true);
    try {
      await signupHospital({ ...form, location_id: Number(form.location_id) });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      quote="Find the right donor, minutes not hours."
      description="Register your hospital to post requests and match with eligible donors nearby."
    >
      <h2 className="mb-5 text-xl font-bold">Hospital sign up</h2>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          placeholder="Hospital name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Input
          placeholder="Contact phone"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          required
        />

        <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
          <SelectTrigger className="w-full">
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

        <Button type="submit" disabled={loading} className="mt-1">
          {loading ? 'Signing up...' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          className="bg-transparent p-0 font-semibold text-primary hover:bg-transparent hover:underline"
          onClick={() => onSwitch('login')}
        >
          Log in
        </button>
      </p>
    </AuthShell>
  );
}
