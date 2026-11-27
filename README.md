# Umoja Housing Agencies

Umoja Housing Agencies operates **Yomic Stays**, an independent accommodation
discovery and booking platform for Kenya. Property owners manage their own
listings on the platform; listings from Booking.com or Airbnb are not imported
or booked through this app.

## Technology

- React and TanStack Start
- Supabase for authentication, PostgreSQL, and image storage
- Vite for local development and production builds

## Run locally

1. Install Node.js and npm.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env` and configure the Supabase project:

   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser.
   - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for server functions.
   - `SUPABASE_SERVICE_ROLE_KEY` for trusted server-side admin operations only.

   Never expose the service-role key through a `VITE_` variable or commit it.

4. Apply the database migrations in `supabase/migrations` to the configured
   Supabase project.
5. Start the development server:

   ```sh
   npm run dev
   ```

Useful checks:

```sh
npm run build
npm run lint
```

## Locations and listings

The destination selector is backed by Supabase and includes Kenya's 47 county
headquarters. Public search shows Yomic listings that are both published and
verified. New owner listings remain drafts until they are submitted and
approved by an administrator.

## Property-owner dashboard

Signed-in users can open `/owner` and choose **Become a host** to enable the
property-owner role. From the dashboard, owners can:

- Create listings and submit drafts for verification.
- Edit listing details, nightly rates, and photo URLs.
- Upload up to 20 photos per listing (JPG, PNG, WebP, or AVIF; 8 MB maximum per
  image).
- Add date-specific availability rules, set rate overrides, open or block dates,
  and remove rules.
- Review reservations, message guests, and manage check-in/completion status.

Only upload photos you own or are authorized to use. The `property-images`
Supabase Storage bucket is public so listing photos can be displayed to
travelers; do not upload private or sensitive images. Storage write policies
restrict owners to their own user-ID folder.

## Database

Database schema and seed changes are maintained as SQL migrations under
`supabase/migrations`. Link the Supabase CLI to the intended project before
applying migrations, and ensure the deployment environment has the required
Supabase variables configured.
