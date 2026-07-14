import { LegalDocument } from '@/components/LegalDocument';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Terms() {
  const { settings, isLoading } = useSiteSettings();

  return (
    <LegalDocument
      title="Terms & Conditions"
      body={settings.terms_conditions}
      updatedAt={settings.updated_at}
      isLoading={isLoading}
    />
  );
}
