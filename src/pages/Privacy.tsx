import LegalPage from "./LegalPage";
import { privacyPolicy } from "../data/legal";

export default function Privacy() {
  return (
    <LegalPage
      title={privacyPolicy.title}
      updated={privacyPolicy.updated}
      sections={privacyPolicy.sections}
      otherHref="/kvkk"
      otherLabel="KVKK Aydınlatma Metni"
      metaDescription="xShield Teknoloji gizlilik politikası: kişisel verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuz."
    />
  );
}
