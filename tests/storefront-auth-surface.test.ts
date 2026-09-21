import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth=fs.readFileSync('src/components/auth/auth-form.tsx','utf8');
const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');

assert.match(auth,/data-storefront-auth-surface="true"/,'customer auth must expose the shared storefront auth surface');
assert.match(auth,/--shoporation-color-primary/,'auth styling must inherit template design tokens');
assert.match(auth,/min-height:44px/,'auth actions must retain the shared touch target minimum');
assert.match(shell,/resolveCurrentStorefrontAccountRuntimePage\(customerId\)/,'account shell must resolve storefront runtime for signed-out users too');
assert.doesNotMatch(shell,/if\(!customerId\)return <>{children}<\/>/,'signed-out auth must not bypass the storefront template shell');
assert.match(shell,/data-storefront-template={runtime\.page\.templateKey}/,'auth shell must expose the active template identity');
assert.match(source,/customerId:string\|null/,'account runtime resolver must support anonymous auth');
assert.match(source,/request\?getStorefrontDigitalCommerceRuntimeModel/,'anonymous auth must not request customer-only commerce data');

console.log('storefront auth surface regression: PASS');
