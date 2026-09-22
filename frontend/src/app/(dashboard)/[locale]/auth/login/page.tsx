import LoginPage from '../../../../auth/login/page';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export default function LocaleLoginPage() {
  return <LoginPage />;
}
