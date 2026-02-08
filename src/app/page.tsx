'use client';

import { useEffect, useState } from 'react';
import { useStore, isProfileComplete } from '@/lib/store';
import LoginPage from '@/components/auth/login-page';
import ProfileForm from '@/components/profile/profile-form';
import KonsumenDashboard from '@/components/dashboard/konsumen-dashboard';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import KolektorDashboard from '@/components/dashboard/kolektor-dashboard';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthErrorMessage } from '@/lib/helpers';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function Home() {
  const [authLoading, setAuthLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setLoading,
    showSnackbar,
  } = useStore();

  // Load user from Firebase Auth on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);

      if (authUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: authUser.uid,
            ...userDoc.data(),
          } as any);
        } else {
          // Create basic user document if not exists
          await setDoc(doc(db, 'users', authUser.uid), {
            email: authUser.email,
            role: 'konsumen',
            namaLengkap: authUser.email,
          });
          setUser({
            uid: authUser.uid,
            email: authUser.email || '',
            role: 'konsumen',
            namaLengkap: authUser.email,
          });
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      toast.success('Login berhasil!');
    } catch (error: any) {
      setAuthError(getAuthErrorMessage(error.code));
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (credentials: { email: string; password: string }) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const cred = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: credentials.email,
        role: 'konsumen',
        namaLengkap: credentials.email,
      });
      toast.success('Registrasi berhasil! Silakan login.');
    } catch (error: any) {
      setAuthError(getAuthErrorMessage(error.code));
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Anda telah logout.');
    } catch (error) {
      toast.error('Gagal logout.');
    }
  };

  const handleSaveProfile = async (profileData: any) => {
    if (!user) return;

    setProfileLoading(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), profileData);
      setUser({ ...user, ...profileData });
      toast.success('Profil berhasil disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan profil.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login page
  if (!isAuthenticated || !user) {
    return (
      <>
        <LoginPage
          loading={authLoading}
          errorMessage={authError}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onError={setAuthError}
        />
        <Toaster />
      </>
    );
  }

  // Logged in but profile not complete (konsumen only)
  if (user.role === 'konsumen' && !isProfileComplete(user)) {
    return (
      <>
        <ProfileForm
          user={user}
          loading={profileLoading}
          onSave={handleSaveProfile}
        />
        <Toaster />
      </>
    );
  }

  // Dashboard based on role
  return (
    <>
      {user.role === 'konsumen' && <KonsumenDashboard onLogout={handleLogout} />}
      {user.role === 'admin' && <AdminDashboard onLogout={handleLogout} />}
      {user.role === 'kolektor' && <KolektorDashboard onLogout={handleLogout} />}
      <Toaster />
    </>
  );
}
