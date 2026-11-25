import LegalDocument from '../components/LegalDocument';

const sections = [
  {
    title: "What SafeDose is",
    body: "SafeDose is a web and mobile dose calculation and verification app operated by Gainous Media & Tech Group LLC, a California limited liability company. SafeDose performs conversions from inputs users verify. It does not diagnose, recommend doses, or provide medical advice. Users should independently confirm doses with a licensed professional.",
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
    title: "Optional email updates",
    body: "If you choose to save your email after reaching the free scan limit, SafeDose stores it in a private Firebase database with your opt-in time, whether you were a guest or signed in with Google, and where you signed up. SafeDose uses it to follow up with SafeDose updates. To withdraw your opt-in and request removal, email rodney.gainous@gmail.com from the address you submitted.",
  },
  {
    title: "Calculations and dose logs",
    body: "Manual calculation and dose log data may include substance, concentration, entered dose, calculated volume, syringe details, site and timing. Dose logs are stored on device and can sync to Firestore for non-guest users. Individual log deletion removes the local entry and attempts to delete its synced record. Scan and manual calculation evaluation records can include inputs, results, identifiers and quality metadata. Local evaluation records can include an encoded photo. The Firestore evaluation write substitutes image metadata for image bytes.",
  },
  {
    title: "Scans and photos",
    body: "The scan feature sends an encoded photo of a vial or syringe to SafeDose's analysis API. The API passes the image to OpenAI for analysis and uses requester IP information for temporary rate limiting. SafeDose does not use your data to train AI models. Scan requests go to the OpenAI API, which does not use API data to train its models by default. SafeDose does not turn on OpenAI response storage. OpenAI may keep API data for up to 30 days for abuse monitoring.",
  },
  {
    title: "Usage and device storage",
    body: "Vercel Web Analytics counts page views by route, with query strings and fragments removed, and sets no advertising identifiers. Browser Firebase Analytics can receive onboarding and feature usage events, scan and calculation activity, profile categories and age ranges. Some events include user IDs. AsyncStorage saves app state and user records on the device. The web service worker caches app assets. Some onboarding screens load images from Unsplash.",
  },
  {
    title: "Payments and hosting",
    body: "The web app is hosted on Vercel. Stripe hosts subscription checkout and payment entry. SafeDose sends price and offer, source metadata and return URLs to create a checkout session. Billing status and portal paths use Stripe customer or subscription information. The pricing page says web checkout, cancel anytime, and calculator stays free.",
  },
  {
    title: "Data retention",
    body: "SafeDose keeps your account, profile and synced dose log data while your account is active. After a deletion request, SafeDose deletes that data within 30 days. Data stored on your device stays there until you delete it or remove the app. Stripe keeps billing records as required by law.",
  },
  {
    title: "Deleting your account",
    body: "To delete your account and its data, email rodney.gainous@gmail.com from the address on your account with the subject \"Delete my SafeDose account\". SafeDose confirms by email once the data is deleted, within 30 days. You can delete individual dose logs in the app at any time.",
  },
  {
    title: "Refunds",
    body: "You can cancel your subscription at any time from billing settings, which stops future renewals. Payments are not refundable except where the law requires it. If you think you were charged in error, email rodney.gainous@gmail.com within 30 days of the charge and SafeDose will review it.",
  },
  {
    title: "Contact",
    body: "SafeDose is operated by Gainous Media & Tech Group LLC, a California limited liability company. This policy is governed by California law. Questions or requests: rodney.gainous@gmail.com. Effective date: November 18, 2026.",
  },
];

export default function PrivacyPage() {
  return <LegalDocument path="/privacy" title="Privacy Policy for SafeDose" sections={sections} />;
}
