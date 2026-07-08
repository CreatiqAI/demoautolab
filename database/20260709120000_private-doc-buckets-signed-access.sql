-- merchant-documents & vendor-payout-slips buckets were made private in the audit,
-- but their storage.objects SELECT policy was still PUBLIC ({} role) — meaning the
-- files were both (a) unreachable via the stored getPublicUrl links (404 "Bucket not
-- found") AND (b) still readable by anyone who signed a URL. Restrict SELECT to
-- authenticated users (admins + owning merchant/vendor); the frontend serves
-- short-lived signed URLs via src/components/SignedMerchantDoc.tsx.

drop policy if exists "Public can view merchant documents" on storage.objects;
create policy "Authed can view merchant documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'merchant-documents');

drop policy if exists "Public can view payout slips" on storage.objects;
create policy "Authed can view payout slips"
  on storage.objects for select to authenticated
  using (bucket_id = 'vendor-payout-slips');
