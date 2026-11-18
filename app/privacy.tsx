import LegalDocument from '../components/LegalDocument';

const sections = [
  {
    title: "What SafeDose is",
    body: "SafeDose is a web and mobile dose calculation and verification app. The README credits SafeLab. SafeDose performs conversions from inputs users verify. It does not diagnose, recommend doses, or provide medical advice. Users should independently confirm doses with a licensed professional.",
  },
  {
    title: "Accounts and sign in",
    body: "Firebase Authentication gives guests an anonymous Firebase ID. Google sign in through Firebase gives the app access to the user's Google profile name and email. Settings can display the signed-in user's email.",
  },
  {
    title: "Onboarding and profile",
    body: "Onboarding can collect professional or athlete status, intended use, and an optional birth date and derived age. The app can save profile details, plan status and usage counters locally and in Google Firebase Cloud Firestore. This includes guests with a Firebase ID. Firestore also has submission paths for onboarding intent, surveys, feedback and compound suggestions.",
  },
  {
    title: "Calculations and dose logs",
    body: "Manual calculation and dose log data may include substance, concentration, entered dose, calculated volume, syringe details, site and timing. Dose logs are stored on device and can sync to Firestore for non-guest users. Individual log deletion removes the local entry and attempts to delete its synced record. Scan and manual calculation evaluation records can include inputs, results, identifiers and quality metadata. Local evaluation records can include an encoded photo. The Firestore evaluation write substitutes image metadata for image bytes.",
  },
  {
    title: "Scans and photos",
    body: "The scan feature sends an encoded photo of a vial or syringe to SafeDose's analysis API. The API passes the image to OpenAI for analysis and uses requester IP information for temporary rate limiting. Source contains evaluation export and fine-tuning preparation code. Actual training use and provider retention settings: [NEEDS RODNEY].",
  },
  {
    title: "Usage and device storage",
    body: "Browser Firebase Analytics can receive onboarding and feature usage events, scan and calculation activity, profile categories and age ranges. Some events include user IDs. AsyncStorage saves app state and user records on the device. The web service worker caches app assets. Some onboarding screens load images from Unsplash.",
  },
  {
    title: "Payments and hosting",
    body: "The web app is hosted on Vercel. Stripe hosts subscription checkout and payment entry. SafeDose sends price and offer, source metadata and return URLs to create a checkout session. Billing status and portal paths use Stripe customer or subscription information. The pricing page says web checkout, cancel anytime, and calculator stays free.",
  },
  {
    title: "Contact and missing facts",
    body: "The README, pricing and app screens reviewed show no support or privacy email address. Contact email: [NEEDS RODNEY]. Refund rules: [NEEDS RODNEY]. Legal entity details: [NEEDS RODNEY]. Effective date: [NEEDS RODNEY]. Jurisdiction: [NEEDS RODNEY]. Retention periods: [NEEDS RODNEY]. Account deletion request process: [NEEDS RODNEY].",
  },
];

export default function PrivacyPage() {
  return <LegalDocument title="Privacy Policy for SafeDose" sections={sections} />;
}
