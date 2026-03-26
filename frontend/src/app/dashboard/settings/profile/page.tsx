'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Check, Camera } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLanguage } from '@/lib/hooks/use-language';

function resizeToDataURL(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);

  const initials = `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || 'U';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t.profileSettingsPage.imageTooLarge);
      return;
    }
    try {
      const dataUrl = await resizeToDataURL(file, 256);
      setAvatarPreview(dataUrl);
      setAvatarData(dataUrl);
      setError('');
    } catch {
      setError(t.profileSettingsPage.imageReadFailed);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      setError('');
      setSuccess('');

      await authClient.updateUser({
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone: phone || undefined,
        ...(avatarData ? { image: avatarData } : {}),
      });

      setSuccess(t.profileSettingsPage.updateSuccess);
      setAvatarData(null);
    } catch {
      setError(t.profileSettingsPage.updateFailed);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.settings.profile}</h1>
          <p className="text-gray-500 text-sm">{t.settings.profileDesc}</p>
        </div>
      </div>

      {/* Avatar card */}
      <Card>
        <CardHeader>
          <CardTitle>{t.profileSettingsPage.avatarTitle}</CardTitle>
          <CardDescription>{t.profileSettingsPage.avatarDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview ?? (user as { image?: string })?.image ?? ''} alt={initials} />
                <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {t.profileSettingsPage.changePhoto}
              </Button>
              <p className="text-xs text-gray-400 mt-1">{t.profileSettingsPage.photoHint}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.profileSettingsPage.personalInfoTitle}</CardTitle>
          <CardDescription>{t.profileSettingsPage.personalInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t.profileSettingsPage.firstName}</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t.profileSettingsPage.lastName}</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">{t.profileSettingsPage.emailNote}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t.profileSettingsPage.phone}</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213XXXXXXXXX" />
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t.profileSettingsPage.save}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
