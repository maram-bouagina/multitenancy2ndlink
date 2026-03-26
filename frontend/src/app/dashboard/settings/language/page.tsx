'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Check, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/use-language';
import { type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LANGUAGES: { code: Lang; nativeLabel: string; localLabel: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', nativeLabel: 'Français', localLabel: 'French', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', nativeLabel: 'English', localLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', nativeLabel: 'العربية', localLabel: 'Arabic', flag: '🇸🇦', dir: 'rtl' },
];

export default function LanguageSettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const [selected, setSelected] = useState<Lang>(lang);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setLang(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.settings.language}</h1>
          <p className="text-gray-500 text-sm">{t.settings.languageDesc}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            {t.language.title}
          </CardTitle>
          <CardDescription>{t.language.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saved && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{t.language.saved}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => setSelected(language.code)}
                dir={language.dir}
                className={cn(
                  'flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                  selected === language.code
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <span className="text-3xl">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{language.nativeLabel}</div>
                  {language.dir === 'rtl' && (
                    <div className="text-xs text-gray-500 mt-0.5">{t.language.rtlNote}</div>
                  )}
                </div>
                {selected === language.code && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={selected === lang}
            className="w-full sm:w-auto"
          >
            {t.language.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
