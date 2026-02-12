import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/store/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';

const AdminLoginSection: React.FC = () => {
  const { login, isLoading, error, setError } = useAdmin();
  const { setCurrentView } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    const success = await login(email, password);
    if (success) {
      toast.success('Welcome to Admin Panel');
      setCurrentView('admin-dashboard');
    } else {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 grain-overlay" />
      </div>

      {/* Login card */}
      <Card className="relative w-full max-w-md bg-[#111611] border-[#1A211A] shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-display font-bold text-[#F6FFF2]">
              Admin Panel
            </h1>
            <p className="text-sm text-[#A9B5AA]">
              Sign in to manage the Rooted platform
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#F6FFF2]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rooted.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2] placeholder-[#A9B5AA]/50"
              />
              <p className="text-xs text-[#A9B5AA]">
                Try: sarah@rooted.app, marcus@rooted.app, or emma@rooted.app
              </p>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#F6FFF2]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2] placeholder-[#A9B5AA]/50"
              />
              <p className="text-xs text-[#A9B5AA]">
                All accounts use password: admin123
              </p>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D9FF3D] text-[#0B0F0C] font-semibold hover:scale-105 transition-transform"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t border-[#1A211A]">
            <button
              onClick={() => setCurrentView('landing')}
              className="w-full text-sm text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminLoginSection;
