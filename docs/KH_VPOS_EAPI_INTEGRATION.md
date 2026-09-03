# K&H vPOS eAPI integration

Shoperation uses the current K&H vPOS eAPI v1.0 basic card-payment flow.

## Server-side secrets

Configure these as environment secrets; never store private keys in tenant JSON configuration:

- `KH_VPOS_ID` — the K&H vPOS ID used as eAPI `merchantId` (not the acceptor MID)
- `KH_PRIVATE_KEY` — merchant RSA private signing key in PEM form
- `KH_PRIVATE_KEY_PASSPHRASE` — optional, only if the private key is encrypted
- `KH_GATEWAY_PUBLIC_KEY` — K&H gateway RSA public key in PEM form
- `KH_ENVIRONMENT` — exactly `sandbox` or `live`

## Flow

1. Shoperation allocates a numeric, maximum 10-digit K&H `orderNo` per payment attempt.
2. Server signs and POSTs `/payment/init` using SHA256withRSA.
3. The signed INIT response is verified with the K&H public key.
4. Server resolves the signed `/payment/process` redirect and sends the customer to K&H.
5. K&H returns the browser to `/api/payments/kh/return` by GET or POST.
6. Shoperation does not trust the browser return as payment proof. It performs a signed `/payment/status` request, verifies the K&H response signature, then applies the authoritative payment state.
7. Only verified paid states can mark an order paid and trigger invoice/logistics jobs.

The Water-K K&H connection must remain disabled until sandbox/live credentials are present and the ECHO health check succeeds.
