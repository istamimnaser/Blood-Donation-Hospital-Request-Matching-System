import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from './AuthShell.jsx';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.jsx';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth();
  const [role, setRole] = useState('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      quote="Every donation is someone's second chance."
      description="Sign in to manage your availability and matches, or find donors for a request."
    >
      <h2 className="mb-5 text-xl font-bold">Log in</h2>

      <Tabs value={role} onValueChange={setRole} className="mb-5 w-fit">
        <TabsList>
          <TabsTrigger value="donor">Donor</TabsTrigger>
          <TabsTrigger value="hospital">Hospital</TabsTrigger>
        </TabsList>
      </Tabs>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="mt-1">
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        New {role}?{' '}
        <button
          type="button"
          className="bg-transparent p-0 font-semibold text-primary hover:bg-transparent hover:underline"
          onClick={() => onSwitch(`signup-${role}`)}
        >
          Sign up
        </button>
      </p>
    </AuthShell>
  );
}
