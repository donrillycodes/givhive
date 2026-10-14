# Cash donation pause

The current release supports food pledges. Cash donation creation and Stripe Connect onboarding are disabled by source-controlled release constants in:

- `packages/backend/src/config/features.ts`
- `apps/mobile/lib/features.ts`
- `apps/web/lib/features.ts`

The backend rejects both PaymentIntent and Checkout Session creation, plus Connect account creation and onboarding-link refresh, with HTTP 503 before database reads or Stripe requests. This also protects against older app builds calling these endpoints.

Mobile checkout deep links redirect to Discover. The dashboard's Stripe page redirects to the NGO dashboard. Donation buttons and payout navigation are hidden. Mobile activity starts on food pledges and displays past cash donations only when records exist; the NGO dashboard retains historical records as well.

Payment records and existing webhook processing are preserved. Stripe initialization is lazy, so the food-pledge backend starts without Stripe credentials. Keep valid Stripe credentials and the signing secret configured if historical payment events still need processing. This change does not cancel Checkout Sessions already issued by Stripe or close connected Stripe accounts.

No database migration is required for this step. Deploy the backend together with the dashboard, and distribute a new mobile build to update the visible experience.

Do not re-enable cash donations merely by changing the constants: first repair and test payment routing, confirmation, retries and refunds; onboard verified recipient organisations; and meet the applicable store fundraising requirements.
