import LegalPage from "./LegalPage";
import { kvkkNotice } from "../data/legal";

export default function Kvkk() {
  return (
    <LegalPage
      title={kvkkNotice.title}
      updated={kvkkNotice.updated}
      sections={kvkkNotice.sections}
      otherHref="/gizlilik"
      otherLabel="Gizlilik Politikası"
    />
  );
}
