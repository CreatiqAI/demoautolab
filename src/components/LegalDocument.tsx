import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

interface LegalDocumentProps {
  title: string;
  /** Plain text from site_settings. "## " starts a heading; blank lines split paragraphs. */
  body: string;
  updatedAt?: string;
  isLoading?: boolean;
}

/** Splits the stored text into headings and paragraphs. */
function renderBlocks(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      if (block.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold text-gray-900 mt-10 mb-3 first:mt-0">
            {block.slice(3)}
          </h2>
        );
      }

      // A run of "- " lines is a list.
      const lines = block.split('\n');
      if (lines.every((l) => l.startsWith('- '))) {
        return (
          <ul key={i} className="list-disc pl-5 space-y-1 text-gray-700 leading-relaxed mb-4">
            {lines.map((l, j) => (
              <li key={j}>{l.slice(2)}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={i} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {block}
        </p>
      );
    });
}

export function LegalDocument({ title, body, updatedAt, isLoading }: LegalDocumentProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{title}</h1>

          {updatedAt && (
            <p className="text-sm text-gray-500 mb-10">
              Last updated{' '}
              {new Date(updatedAt).toLocaleDateString('en-MY', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : body.trim() ? (
            <div>{renderBlocks(body)}</div>
          ) : (
            <p className="text-gray-500">This page hasn't been published yet.</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
