CREATE TABLE IF NOT EXISTS public.external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  town text NOT NULL CHECK (length(trim(town)) > 0),
  source_name text NOT NULL CHECK (length(trim(source_name)) > 0),
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_name, source_url)
);

CREATE INDEX IF NOT EXISTS external_listings_destination_active_idx
  ON public.external_listings (destination_id, is_active);

ALTER TABLE public.external_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_listings_read_active ON public.external_listings;
CREATE POLICY external_listings_read_active
  ON public.external_listings
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

REVOKE ALL ON TABLE public.external_listings FROM anon, authenticated;
GRANT SELECT ON TABLE public.external_listings TO anon, authenticated;

INSERT INTO public.external_listings (destination_id, title, town, source_name, source_url)
SELECT destinations.id, listings.title, listings.town, 'Booking.com', listings.source_url
FROM (
  VALUES
    ('nairobi', 'Anyaka Kindaruma Homes', 'Nairobi', 'https://www.booking.com/hotel/ke/anyaka-kindaruma-homes.html'),
    ('nairobi', 'kindaruma units', 'Nairobi', 'https://www.booking.com/hotel/ke/kindaruma-units.html'),
    ('kisumu', 'Mambgrey 1br,2br&3br apartments', 'Kisumu', 'https://www.booking.com/hotel/ke/laika-apartments.html'),
    ('kisumu', 'Klen apartments', 'Kisumu', 'https://www.booking.com/hotel/ke/klen-cbd-apartments.html'),
    ('kisii', 'Lass Grove Home', 'Kisii', 'https://www.booking.com/hotel/ke/lass-grove-home.html'),
    ('kisii', 'Shwari Home Stays', 'Kisii', 'https://www.booking.com/hotel/ke/shwari-home-stays.html'),
    ('nakuru', 'The Encore Hotel Nakuru', 'Nakuru', 'https://www.booking.com/hotel/ke/the-encore-nakuru.html'),
    ('nakuru', 'Milimani Executive Suites', 'Nakuru', 'https://www.booking.com/hotel/ke/milimani-exec-suites-with-pool-and-gym.html'),
    ('mombasa', 'Oceanview Oasis homestay', 'Mombasa', 'https://www.booking.com/hotel/ke/sport-light-homestay-nyali.html'),
    ('mombasa', 'AQUA GARDENS homestay', 'Mombasa', 'https://www.booking.com/hotel/ke/her-excellency-homestay-nyali.html'),
    ('kwale', 'Germano Cottages', 'Kwale', 'https://www.booking.com/hotel/ke/cottages-garden-and-pool.html'),
    ('kwale', 'Sea la vie - Macheo', 'Kwale', 'https://www.booking.com/hotel/ke/sea-la-vie-macheo.html'),
    ('kilifi', 'Mnarani Beach Club', 'Kilifi', 'https://www.booking.com/hotel/ke/mnarani-club-amp-spa.html'),
    ('kilifi', 'Hewani apartment', 'Kilifi', 'https://www.booking.com/hotel/ke/hewani-kilifi1.html'),
    ('lamu', 'Samaki House', 'Lamu', 'https://www.booking.com/hotel/ke/samaki-house-lamu.html'),
    ('lamu', 'The Kitau Garden House', 'Lamu', 'https://www.booking.com/hotel/ke/the-kitau-garden-house-tamarind-gardens.html'),
    ('mwatate', 'Oasis Hotel and Guest House. Voi', 'Voi', 'https://www.booking.com/hotel/ke/oasis-and-guest-house-voi.html'),
    ('mwatate', 'Salt Lick Safari Lodge', 'Tsavo West National Park', 'https://www.booking.com/hotel/ke/sarova-salt-lick-game-lodge.html'),
    ('mandera', 'Dencity Hotel', 'Mandera', 'https://www.booking.com/hotel/ke/dencity-mandera-mandera3.html'),
    ('mandera', 'Granada Hotel', 'Mandera', 'https://www.booking.com/hotel/ke/granada-mandera.html'),
    ('marsabit', 'Big Tusks Hotel', 'Marsabit', 'https://www.booking.com/hotel/ke/big-tusks-marsabit.html'),
    ('marsabit', 'Grace bnb', 'Marsabit', 'https://www.booking.com/hotel/ke/grace-marsabit.html'),
    ('isiolo', 'Elboran resort and spa', 'Isiolo', 'https://www.booking.com/hotel/ke/elboran-resort-and-spa.html'),
    ('isiolo', 'Iman Hotel', 'Isiolo', 'https://www.booking.com/hotel/ke/iman.html'),
    ('meru', 'Tamwe ltd agency', 'Meru', 'https://www.booking.com/hotel/ke/tamwe-ltd-agency.html'),
    ('meru', 'Ashville Homes Meru', 'Meru', 'https://www.booking.com/hotel/ke/ashville-homes-meru.html'),
    ('kathwana', 'Hidden Treasure Lodge Chuka', 'Chuka', 'https://www.booking.com/hotel/ke/hidden-treasure-lodge.html'),
    ('kathwana', 'Nancy''s Farm House', 'Chuka', 'https://www.booking.com/hotel/ke/nancys-farm-house.html'),
    ('embu', 'Embu Air-bnb', 'Embu', 'https://www.booking.com/hotel/ke/t-tree-guest-house.html'),
    ('embu', 'Royal Gardens Muthatari', 'Embu', 'https://www.booking.com/hotel/ke/royal-gardens-muthatari-embu.html'),
    ('kitui', 'Villa Esperanza', 'Kitui', 'https://www.booking.com/hotel/ke/villa-esperanza-kitui.html'),
    ('kitui', 'Lacienda Kitui Resort', 'Kitui', 'https://www.booking.com/hotel/ke/kitui-metro-kitui1.html'),
    ('machakos', 'Furnished 1 bedroom', 'Machakos', 'https://www.booking.com/hotel/ke/furnished-1-bedroom-near-machakos-university-muthini-area.html'),
    ('machakos', 'Tirisi Homes 2', 'Machakos', 'https://www.booking.com/hotel/ke/tirisi-homes-muthini-machakos.html'),
    ('wote', 'Acacia Resort', 'Wote', 'https://www.booking.com/hotel/ke/acacia-resort-wote-makueni-wote.html'),
    ('wote', 'Shali Hotel', 'Wote', 'https://www.booking.com/hotel/ke/shali.html'),
    ('nyeri', 'Outspan Hotel', 'Nyeri', 'https://www.booking.com/hotel/ke/outspan-nyeri-nyeri.html'),
    ('nyeri', 'The Treetops Lodge', 'Aberdare National Park', 'https://www.booking.com/hotel/ke/the-treetops-lodge.html'),
    ('kerugoya', 'SILVER SLOPES RESORT AND SPA', 'Kagio', 'https://www.booking.com/hotel/ke/silver-slopes-resort-and-spa.html'),
    ('kerugoya', 'Abai Lodges & Spa', 'Kagio', 'https://www.booking.com/hotel/ke/abai-lodges-amp-spa.html'),
    ('muranga', 'SAMARINE RESORT and SPA', 'Maragua', 'https://www.booking.com/hotel/ke/samarine-resort-and-spa.html'),
    ('muranga', 'Shanvilla Resort Ltd', 'Murang''a', 'https://www.booking.com/hotel/ke/shanvilla-resort-ltd.html'),
    ('kiambu', 'ORAK Fairway Golf Villa', 'Kiambu', 'https://www.booking.com/hotel/ke/orak-fairway-golf-villa-in-kiambu-with-pool-and-sauna.html'),
    ('kiambu', 'Marys Home', 'Kiambu', 'https://www.booking.com/hotel/ke/marys-home-kiambu.html'),
    ('lodwar', 'Scholars Lounge & Guest House', 'Lodwar', 'https://www.booking.com/hotel/ke/scholars-guest-and-house.html'),
    ('lodwar', 'GGstarways', 'Lodwar', 'https://www.booking.com/hotel/ke/ggstarways.html'),
    ('kapenguria', 'Chesito Homes', 'Kapenguria', 'https://www.booking.com/hotel/ke/chesito-homes.html'),
    ('kapenguria', 'Asoyon homes', 'Kapenguria', 'https://www.booking.com/hotel/ke/asoyon-homes.html'),
    ('maralal', 'Seriani BNB', 'Maralal', 'https://www.booking.com/hotel/ke/seriani-bnb.html'),
    ('maralal', 'Ngari Hill EcoLodge', 'Maralal', 'https://www.booking.com/hotel/ke/ngari-hill-ecolodge-maralal-kenya.html'),
    ('kitale', 'Cozy Homes', 'Kitale', 'https://www.booking.com/hotel/ke/cozy-homes-kitale.html'),
    ('kitale', 'Smart Homes Bnb''s Kitale', 'Kitale', 'https://www.booking.com/hotel/ke/smart-homes-bnbs-kitale.html'),
    ('eldoret', 'Eka Hotel Eldoret', 'Eldoret', 'https://www.booking.com/hotel/ke/eka-eldoret.html'),
    ('eldoret', 'Boma Inn Eldoret', 'Eldoret', 'https://www.booking.com/hotel/ke/boma-inn-eldoret.html'),
    ('iten', 'Molin Iten', 'Iten', 'https://www.booking.com/hotel/ke/molin-iten.html'),
    ('iten', 'Modern Twin Retreat in Iten - Home of Champions', 'Iten', 'https://www.booking.com/hotel/ke/modern-twin-retreat-in-iten-home-of-champions.html'),
    ('kabarnet', 'Rift Valley Hills Resort', 'Kabarnet', 'https://www.booking.com/hotel/ke/rift-valley-hills-resort.html'),
    ('kabarnet', 'Saimo Hotel-Kabarnet', 'Kabarnet', 'https://www.booking.com/hotel/ke/saimo-kabarnet-kabarnet.html'),
    ('rumuruti', 'Rumuruti, Laikipia 1BedroomApartment UM', 'Rumuruti', 'https://www.booking.com/hotel/ke/rumuruti-laikipia-1bedroomapartment-um.html'),
    ('rumuruti', 'Rumuruti Laikipia Luxurious Studio UMH', 'Rumuruti', 'https://www.booking.com/hotel/ke/rumuruti-laikipia-luxurious-studio-umh.html'),
    ('narok', 'Namelok camp', 'Narok', 'https://www.booking.com/hotel/ke/namelok-camp.html'),
    ('narok', 'Larami House Narok', 'Narok', 'https://www.booking.com/hotel/ke/larami-house-narok.html'),
    ('kajiado', 'Tulia Skies Villas, With Pool And Valley Views', 'Kajiado', 'https://www.booking.com/hotel/ke/tulia-views-4-bedroom-with-pool-champagne-ridge.html'),
    ('kajiado', 'Kajiadohomes 3', 'Kajiado', 'https://www.booking.com/hotel/ke/kajiadohomes-3.html'),
    ('kericho', 'The Beleza Suites', 'Kericho', 'https://www.booking.com/hotel/ke/the-beleza-suites.html'),
    ('kericho', 'Zoe Homes 1br and 2br Apartment Greypoint 406', 'Kericho', 'https://www.booking.com/hotel/ke/zoe-2br-apartment.html'),
    ('bomet', 'Sahara Gardens Bomet', 'Bomet', 'https://www.booking.com/hotel/ke/sahara-gardens-bomet.html'),
    ('bomet', 'Jeda Homey Homes Studio Apartment', 'Bomet', 'https://www.booking.com/hotel/ke/jeda-homey-homes-studio-apartment.html'),
    ('kakamega', 'Golf Hotel Kakamega', 'Kakamega', 'https://www.booking.com/hotel/ke/golf-kakamega.html'),
    ('kakamega', 'Tulivu Suites', 'Kakamega', 'https://www.booking.com/hotel/ke/tulivu-suites.html'),
    ('mbale', 'Inzu ya mama A frame Villas', 'Maragoli', 'https://www.booking.com/hotel/ke/inzu-ya-mama-a-frame-villas.html'),
    ('mbale', 'Areka Court, Mbale-Vihiga County', 'Maragoli', 'https://www.booking.com/hotel/ke/areka-court-mbale-vihiga-county.html'),
    ('bungoma', 'Villa De Leo', 'Bungoma', 'https://www.booking.com/hotel/ke/villa-de-leo-bungoma.html'),
    ('bungoma', 'The Leishen Hotel', 'Bungoma', 'https://www.booking.com/hotel/ke/the-leishen.html'),
    ('busia', 'Border Viewpoint Guest House', 'Busia', 'https://www.booking.com/hotel/ke/border-viewpoint-guest-house.html'),
    ('busia', 'Mipeja Hotel Busia', 'Busia', 'https://www.booking.com/hotel/ke/mipeja.html'),
    ('siaya', 'GreenHaven Siaya Cottages', 'Siaya', 'https://www.booking.com/hotel/ke/greenhaven-siaya-cottages.html'),
    ('siaya', 'Hotel Lourdes, Siaya', 'Siaya', 'https://www.booking.com/hotel/ke/lourdes.html'),
    ('homa-bay', 'Grand Duke Hotel ,Homa Bay', 'Homa Bay', 'https://www.booking.com/hotel/ke/grand-duke-homa-bay.html'),
    ('homa-bay', 'Cool & Calm Home', 'Homa Bay', 'https://www.booking.com/hotel/ke/cool-amp-calm-home.html'),
    ('migori', 'Calabash Hotel, Migori', 'Migori', 'https://www.booking.com/hotel/ke/calabash-migori.html'),
    ('migori', 'Twenty ritz', 'Migori', 'https://www.booking.com/hotel/ke/twenty-ritz-migori1.html'),
    ('nyamira', 'Velvet & Vine stay', 'Nyamira', 'https://www.booking.com/hotel/ke/velvet-amp-vine-stay.html'),
    ('nyamira', 'Twin AirB&B Nyamira', 'Nyamira', 'https://www.booking.com/hotel/ke/twin-airb-amp-b-nyamira.html')
) AS listings(destination_slug, title, town, source_url)
JOIN public.destinations AS destinations
  ON destinations.slug = listings.destination_slug
ON CONFLICT (source_name, source_url) DO UPDATE
SET destination_id = EXCLUDED.destination_id,
    title = EXCLUDED.title,
    town = EXCLUDED.town,
    is_active = TRUE;
