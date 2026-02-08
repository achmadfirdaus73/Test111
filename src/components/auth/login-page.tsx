'use client';

import { useState } from 'react';
import { Truck, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginPageProps {
  loading?: boolean;
  errorMessage?: string | null;
  onLogin: (credentials: { email: string; password: string }) => void;
  onRegister: (credentials: { email: string; password: string }) => void;
  onError?: (error: string) => void;
}

export default function LoginPage({
  loading = false,
  errorMessage,
  onLogin,
  onRegister,
  onError,
}: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onError) onError('');

    // Validation
    if (!email || !password) {
      if (onError) onError('Email dan password wajib diisi');
      return;
    }

    if (password.length < 6) {
      if (onError) onError('Password minimal 6 karakter');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      if (onError) onError('Format email tidak valid');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      if (onError) onError('Password tidak cocok');
      return;
    }

    if (isRegister) {
      onRegister({ email, password });
    } else {
      onLogin({ email, password });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #00796B 0%, #004D40 100%)',
      }}
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
              <Truck className="w-12 h-12 text-teal-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isRegister ? 'Daftar Akun Baru' : 'Selamat Datang!'}
          </CardTitle>
          <CardDescription>Silakan masukkan detail akun Anda</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Alamat E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                />
              </div>
            )}

            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white"
              disabled={loading}
            >
              {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Login'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsRegister(!isRegister);
                if (onError) onError('');
              }}
              disabled={loading}
            >
              {isRegister
                ? 'Sudah punya akun? Login'
                : 'Belum punya akun? Daftar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
