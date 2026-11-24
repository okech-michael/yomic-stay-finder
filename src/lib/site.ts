export const SITE = {
  name: "Umoja Housing Agency",
  shortName: "Umoja",
  tagline: "Know where you'll stay before you travel",
  phone: "+254715842716",
  phoneDisplay: "+254 715 842 716",
  whatsapp: "254715842716",
  email: "info@umojahousing.co.ke",
  address: "Kisii Town, Gusii Region, Kenya",
  destinations: [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Kisii",
    "Nyamira",
    "Nakuru",
    "Eldoret",
    "Keroka",
    "Ogembo",
    "Suneka",
  ],
  propertyTypes: [
    "Apartment",
    "Serviced Apartment",
    "Guest House",
    "Inn",
    "Hotel",
    "Short-stay Rental",
    "Other",
  ],
  amenities: [
    "WiFi",
    "Parking",
    "Security",
    "Hot Shower",
    "Kitchen",
    "Laundry",
    "Self Check-in",
    "Breakfast",
  ],
};

export const whatsappLink = (msg?: string) =>
  `https://wa.me/${SITE.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
export const telLink = () => `tel:${SITE.phone}`;

export const formatKsh = (n: number | null | undefined) =>
  n == null ? "—" : `KSh ${n.toLocaleString("en-KE")}`;
