import LegalDocument from '../components/LegalDocument';

const sections = [
  {
    title: "What SafeDose does",
    body: "SafeDose is a web and mobile dose calculation and verification app. The README credits SafeLab. It performs conversions from inputs users verify.",
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
    body: "Manual calculation and dose log data may include substance, concentration, entered dose, calculated volume, syringe details, site and timing. Dose logs are stored on device and can sync to Firestore for non-guest users. Individual log deletion removes the local entry and attempts to delete its synced record. The scan feature sends an encoded photo of a vial or syringe to SafeDose's analysis API. The API passes the image to OpenAI for analysis and uses requester IP information for temporary rate limiting.",
  },
  {
    title: "Payments",
    body: "Stripe hosts subscription checkout and payment entry. SafeDose sends price and offer, source metadata and return URLs to create a checkout session. The pricing page says web checkout, cancel anytime, and calculator stays free. Refund rules: [NEEDS RODNEY].",
  },
  {
    title: "Missing terms",
    body: "Contact email: [NEEDS RODNEY]. Legal entity details: [NEEDS RODNEY]. Effective date: [NEEDS RODNEY]. Jurisdiction: [NEEDS RODNEY]. Retention periods: [NEEDS RODNEY]. Account deletion request process: [NEEDS RODNEY]. Actual training use and provider retention settings: [NEEDS RODNEY].",
  },
];

export default function TermsPage() {
  return <LegalDocument title="Terms of Service for SafeDose" sections={sections} />;
}
