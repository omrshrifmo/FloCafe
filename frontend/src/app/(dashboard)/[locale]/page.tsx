import { redirect } from 'next/navigation';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export default function LocaleHomePage() {
  redirect('/en/auth/login');
}
