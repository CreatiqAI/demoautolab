import { LegalDocument } from '@/components/LegalDocument';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Privacy() {
  const { settings, isLoading } = useSiteSettings();

  return (
    <LegalDocument
      title="Privacy Policy"
      body={settings.privacy_policy}
      updatedAt={settings.updated_at}
      isLoading={isLoading}
    />
  );
}
