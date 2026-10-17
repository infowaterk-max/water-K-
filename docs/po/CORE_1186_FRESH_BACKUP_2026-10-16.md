# Core #1186 — Owner-key encrypted Fresh Install application backup

This read-only GitHub Actions job targets *only* Shoperation Fresh Install `istjjkdcvsvilrycqecd` and explicitly rejects foreign project URIs. The existing `SHOPERATION_FRESH_INSTALL_DB_URL` repository secret must pass TLS verify-full, native PostgreSQL17 checks, the original 4621 catalog definition digest and zero-customer preflight before `pg_dump`.

The PG17 source archive includes app-owned `public` and `private` schema definitions and their data in a single dump snapshot. A native, separate Docker PG17 restores archive data onto the 47 exact original legacy SQL sources and checks the seven restored neutral catalog groups total 113. The hosted database is never mutated.

A 3072-bit RSA X509 recipient certificate, **public only**, is embedded in the workflow. The private key is not in GitHub; it was generated in the assistant session and MUST be separately downloaded by the owner for durable offline custody before any hosted Office deployment. AES-256-GCM CMS encrypts the tar archive. Only `fresh-backup.cms`, its SHA256 and non-sensitive proof JSON may leave the runner; plaintext is deliberately absent from GitHub artifacts. The artifact expires in 14 days and must be downloaded by the owner.

Manual decryption using the *separately saved* private key:

```sh
openssl cms -decrypt -binary -inform DER -in fresh-backup.cms -recip shoperation-fresh-recovery-public.crt -inkey shoperation-fresh-recovery-private.pem -out recovered.tar
tar -xf recovered.tar
pg_restore --list app-owned.dump
```

This is an **application-schema backup, not a full Supabase provider-managed cluster restore**: Auth, Storage buckets, role catalog, secrets, provider event triggers and complete disaster recovery require separate procedures. The live Office migrations 0047–0058 are NOT included or authorized by this backup job. Supabase projects `waterk-platform` and `waterk-staging` stay untouched. Core #1186 and #1228 stay open until a separately reviewed hosted release and signed-JWT real API proof.

The owner-held private key MUST be preserved offline; neither GitHub nor the database administrator can recover the encrypted file without it.

## Verified execution (2026-10-16)

- **Exact source SHA:** `7c4a6af002df5fab2081bec76c12d8fa10ec9698`
- **GitHub Actions:** https://github.com/infowaterk-max/water-K-/actions/runs/38920697580 — `success`; the full native backup workflow passed
- **Encrypted artifact ID:** `12054259422`; 14-day retention; artifact is a ZIP containing `fresh-backup.cms`, `cipher.sha256`, and `backup-proof.json`
- **Ciphertext SHA-256:** `a650825432987e4a8c9f9d075aae7852260012a526b7ee89e18a1efbf518aa18`
- **Public certificate DER SHA-256:** `b83d0b51e49a8bc61f882b91da88069dfbd1c0987f6367cae114dc7f7a5742c7`
- **Host preflight:** verified exact Fresh Install, PostgreSQL 17, valid Supabase CA root/TLS, 175 public and 2 private application tables; original 4621 definitions matched expected MD5 `e312b40ad91150ce937f4aa00db587f3`
- **Native backup:** `pg_dump -Fc` on only the live Fresh Install application `public` and `private` schemas
- **Native restore:** independent PostgreSQL 17 database, original 0046 schema from pinned sources, restored seven catalog groups totaling 113 neutral rows and manually checked their six referential links
- **Host after-read check:** schema fingerprint unchanged; no hosted DDL/DML
- **Encryption:** locally verified RSA-3072 recipient certificate + CMS AES-256-GCM; no private key in GitHub; no plaintext archive uploaded
- **Independent extraction:** artifact downloaded into assistant session, SHA-256 matched, decrypted with separately kept private key; decrypted TAR contained an actual `PGDMP` PostgreSQL custom archive, SHA-256 `5b5688edc5ebf20ee6a0842e7d112f468c75252251b6f6da5b77c099f74704e9`
- **Release authority:** `BACKUP_VERIFIED_APPLICATION_SCOPE_ONLY` — managed hosted Office migration remains **BLOCKED** until the owner has safely retained the private recovery key and the post-backup release preflight passes. This is not a managed PostgreSQL PITR or complete Supabase cluster recovery guarantee.

On a Free-tier managed Supabase instance, this verifiable logical backup materially improves recoverability but does not provide a provider-side instant restore or cover every managed service dependency. Never claim otherwise.
