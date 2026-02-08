'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfileFormProps {
  user?: any;
  loading?: boolean;
  onSave: (profileData: any) => void;
}

export default function ProfileForm({ user, loading = false, onSave }: ProfileFormProps) {
  const [profile, setProfile] = useState({
    namaLengkap: user?.namaLengkap || user?.email || '',
    jenisUsaha: user?.jenisUsaha || '',
    alamatRumah: user?.alamatRumah || '',
    alamatUsaha: user?.alamatUsaha || '',
    noHape: user?.noHape || '',
    nomorKtp: user?.nomorKtp || '',
    namaSales: user?.namaSales || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !profile.namaLengkap ||
      !profile.jenisUsaha ||
      !profile.alamatRumah ||
      !profile.alamatUsaha ||
      !profile.noHape ||
      !profile.nomorKtp
    ) {
      alert('Semua field wajib diisi');
      return;
    }

    onSave(profile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Lengkapi Profil Anda
          </CardTitle>
          <CardDescription>
            Data ini diperlukan untuk melanjutkan pemesanan
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="namaLengkap"
                  value={profile.namaLengkap}
                  onChange={(e) =>
                    setProfile({ ...profile, namaLengkap: e.target.value })
                  }
                  disabled={loading}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jenisUsaha">Jenis Usaha *</Label>
                <Input
                  id="jenisUsaha"
                  value={profile.jenisUsaha}
                  onChange={(e) =>
                    setProfile({ ...profile, jenisUsaha: e.target.value })
                  }
                  disabled={loading}
                  placeholder="Contoh: Warung Sembako"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamatRumah">Alamat Rumah *</Label>
              <Textarea
                id="alamatRumah"
                value={profile.alamatRumah}
                onChange={(e) =>
                  setProfile({ ...profile, alamatRumah: e.target.value })
                }
                disabled={loading}
                rows={2}
                placeholder="Masukkan alamat rumah lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamatUsaha">Alamat Usaha *</Label>
              <Textarea
                id="alamatUsaha"
                value={profile.alamatUsaha}
                onChange={(e) =>
                  setProfile({ ...profile, alamatUsaha: e.target.value })
                }
                disabled={loading}
                rows={2}
                placeholder="Masukkan alamat usaha lengkap"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noHape">No. HP (WhatsApp) *</Label>
                <Input
                  id="noHape"
                  type="tel"
                  value={profile.noHape}
                  onChange={(e) =>
                    setProfile({ ...profile, noHape: e.target.value })
                  }
                  disabled={loading}
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomorKtp">No. KTP *</Label>
                <Input
                  id="nomorKtp"
                  type="number"
                  value={profile.nomorKtp}
                  onChange={(e) =>
                    setProfile({ ...profile, nomorKtp: e.target.value })
                  }
                  disabled={loading}
                  placeholder="Masukkan nomor KTP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="namaSales">Nama Sales (Jika ada)</Label>
              <Input
                id="namaSales"
                value={profile.namaSales}
                onChange={(e) =>
                  setProfile({ ...profile, namaSales: e.target.value })
                }
                disabled={loading}
                placeholder="Nama sales yang merekomendasikan"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={loading}
                size="lg"
              >
                {loading ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
