import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Fresh Install grants direct core Office SELECT only to authenticated users.
// Never switch these back to the server-admin client: it bypasses user RLS when privileged.
const pages = [
  'src/app/admin/kommunikacio/page.tsx',
  'src/app/admin/kommunikacio/iroda/page.tsx',
  'src/app/admin/kommunikacio/chat/page.tsx',
] as const;

describe('Digital Office user-scoped RLS reads', () => {
  for (const path of pages) {
    it(`${path} queries core Office rows with the signed-in Supabase client`, () => {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      expect(source).toContain("createClient as createOfficeUserClient");
      expect(source).toContain('scopedDb=await createOfficeUserClient()');
      expect(source).toContain("scopedDb.from('office_threads')");
      expect(source).toContain("scopedDb.from('office_messages')");
      expect(source).toContain("scopedDb.from('office_tasks')");
      expect(source).not.toMatch(/\bdb\.from\('office_(?:threads|messages|tasks)'\)/);
      expect(source).toContain('createAdminClient');
    });
  }

  it('does not grant client-side Office table access via a broad service_role SQL grant', () => {
    const migration = readFileSync(join(
      process.cwd(),
      'supabase/customer-baseline/managed-forward/office31_fresh_server_entitlement_select_v1.sql',
    ), 'utf8');
    expect(migration).toContain('GRANT SELECT ON TABLE public.feature_entitlements TO service_role;');
    expect(migration).not.toMatch(/GRANT .*ON .*public\.office_(?:threads|messages|tasks)/i);
  });
});
