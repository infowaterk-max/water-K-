# Core #1186 — Owner-key encrypted Fresh Install application backup

This read-only GitHub Actions job targets *only* Shoperation Fresh Install `istjjkdcvsvilrycqecd` and explicitly rejects foreign project URIs. The existing `SHOPERATION_FRESH_INSTALL_DB_URL` repository secret must pass TLS verify-full, native PostgreSQL17 checks, the original 4621 catalog definition digest and zero-customer preflight before `pg_dump`.

The PG17 source archive includes app-owned `public` and `private` schema definitions and their data in a single dump snapshot. A native, separate Docker PG17 restores archive data onto the 47 exact original legacy SQL sources and checks the seven restored neutral catalog groups total 113. The hosted database is never mutated.

A 3072-bit RSA X509 recipient certificate, **public only**, is embedded in the workflow. The private key is held outside GitHub by the owner. AES-256-GCM CMS encrypts the tar archive. Only `fresh-backup.cms`, its SHA256 and non-sensitive proof JSON may leave the runner; plaintext is deliberately absent from GitHub artifacts. The artifact expires in 14 days and must be downloaded by the owner.

Manual decryption using the *separately saved* private key:

```sh
openssl cms -decrypt -binary -inform DER -in fresh-backup.cms -recip shoperation_fresh_recovery_public.crt -inkey shoperation_fresh_recovery_private.pem -out recovered.tar
tar -xf recovered.tar
pg_restore --list app-owned.dump
```

This is an **application-schema backup, not a full Supabase provider-managed cluster restore**: Auth, Storage buckets, role catalog, secrets, provider event triggers and complete disaster recovery require separate procedures. The live Office migrations 0047–0058 are NOT included or authorized by this backup job. Supabase projects `waterk-platform` and `waterk-staging` stay untouched. Core #1186 and #1228 stay open until a separately reviewed hosted release and signed-JWT real API proof.

The owner-held private key MUST be preserved offline; neither GitHub nor the database administrator can recover the encrypted file without it.
