import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from './AuthShell.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';
import { Label } from './ui/label.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select.jsx';

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  date_of_birth: '',
  blood_group_id: '',
  location_id: '',
  last_donation_date: '',
};

export default function DonorSignupPage({ onSwitch }) {
  const { signupDonor } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

useEffect(() => {
  async function loadData() {
    try {
      const [bloodGroupsData, locationsData] = await Promise.all([
        api.bloodGroups(),
        api.locations()
      ]);

      console.log("locations:", locationsData);

      setBloodGroups(bloodGroupsData);
      setLocations(locationsData);
    } catch (err) {
      console.error("Location loading failed:", err);
    }
  }

  loadData();
}, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.blood_group_id || !form.location_id) {
      toast.error('Please choose a blood group and a location.');
      return;
    }
      if (!form.date_of_birth) {
    toast.error('Please enter your date of birth.');
    return;
  }

  const dob = new Date(form.date_of_birth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  if (age < 18) {
    toast.error('You must be at least 18 years old to donate blood.');
    return;
  }

    if (form.last_donation_date) {
    const donationDate = new Date(form.last_donation_date);

    if (donationDate < dob) {
      toast.error('Last donation date cannot be before your birth date.');
      return;
    }

    if (donationDate > today) {
      toast.error('Last donation date cannot be in the future.');
      return;
    }
  }
    setLoading(true);
    try {
      await signupDonor({
        ...form,
        blood_group_id: Number(form.blood_group_id),
        location_id: Number(form.location_id),
        date_of_birth: form.date_of_birth || null,
        last_donation_date: form.last_donation_date || null,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      quote="Someone nearby needs your blood group right now."
      description="Register once, and hospitals can find and match you when your blood type is needed."
    >
      <h2 className="mb-5 text-xl font-bold">Donor sign up</h2>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />

        <Label className="flex-col items-start gap-1.5">
          <span className="text-muted-foreground">Birthday</span>
          <Input
          type="date"
          max={
          new Date(
          new Date().setFullYear(new Date().getFullYear() - 18)
          )
          .toISOString()
          .split("T")[0]
        }
        value={form.date_of_birth}
        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
        required
        />
        </Label>

        <Select value={form.blood_group_id} onValueChange={(v) => setForm({ ...form, blood_group_id: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Blood group" />
          </SelectTrigger>
          <SelectContent>
            {bloodGroups.map((bg) => (
              <SelectItem key={bg.blood_group_id} value={String(bg.blood_group_id)}>
                {bg.group_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
            <SelectItem
            key={location.location_id}
            value={String(location.location_id)}
  >
            {location.city} - {location.area}
            </SelectItem>
          ))}
          </SelectContent>
        </Select>

        <Label className="flex-col items-start gap-1.5">
          <span className="text-muted-foreground">Last donation date (if any)</span>
          <Input
          type="date"
          min={form.date_of_birth}
          max={new Date().toISOString().split("T")[0]}
          value={form.last_donation_date}
          onChange={(e) =>
            setForm({ ...form, last_donation_date: e.target.value })
          }
        />
        </Label>

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
