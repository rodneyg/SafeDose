import LegalDocument from '../components/LegalDocument';

const sections = [
  {
    title: "What SafeDose does",
    body: "SafeDose is a web and mobile dose calculation and verification app operated by Gainous Media & Tech Group LLC, a California limited liability company. It performs conversions from inputs users verify.",
  },
  {
    title: "What SafeDose does not do",
    body: "SafeDose does not diagnose, recommend doses, or provide medical advice. It is not medical advice. Users must confirm doses with a licensed professional.",
  },
  {
    title: "Your role",
    body: "You verify the inputs you enter. You independently confirm doses with a licensed professional.",
  },
  {
    title: "Accounts",
    body: "Firebase Authentication gives guests an anonymous Firebase ID. Google sign in through Firebase gives the app access to the user's Google profile name and email. The app can save profile details, plan status and usage counters locally and in Firestore, including for guests with a Firebase ID.",
  },
  {
    title: "Calculations, logs and scans",
    body: "Manual calculation and dose log data may include substance, concentration, entered dose, calculated volume, syringe details, site and timing. Dose logs are stored on device and can sync to Firestore for non-guest users. Individual log deletion removes the local entry and attempts to delete its synced record. The scan feature sends an encoded photo of a vial or syringe to SafeDose's analysis API. The API passes the image to OpenAI for analysis and uses requester IP information for temporary rate limiting. SafeDose does not use your data to train AI models, and the OpenAI API does not use API data for training by default.",
  },
  {
    title: "Payments",
    body: "Stripe hosts subscription checkout and payment entry. SafeDose sends price and offer, source metadata and return URLs to create a checkout session. The pricing page says web checkout, cancel anytime, and calculator stays free. You can cancel at any time from billing settings, which stops future renewals. Payments are not refundable except where the law requires it. If you think you were charged in error, email rodney.gainous@gmail.com within 30 days of the charge and SafeDose will review it.",
  },
  {
    title: "Data and account deletion",
    body: "SafeDose keeps your account data while your account is active and deletes it within 30 days of a deletion request. To delete your account, email rodney.gainous@gmail.com from the address on your account. The Privacy Policy has the details.",
  },
  {
    title: "Governing law",
    body: "These terms are governed by the laws of the State of California. Any dispute will be handled in the state or federal courts located in California.",
  },
  {
    title: "Contact",
    body: "SafeDose is operated by Gainous Media & Tech Group LLC, a California limited liability company. Contact: rodney.gainous@gmail.com. Effective date: November 18, 2026.",
  },
];

export default function TermsPage() {
  return <LegalDocument title="Terms of Service for SafeDose" sections={sections} />;
}
