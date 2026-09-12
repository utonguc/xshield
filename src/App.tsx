import { MotionConfig } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Kvkk from "./pages/Kvkk";

export default function App() {
  return (
    // reducedMotion="user": prefers-reduced-motion açık ziyaretçilerde
    // framer-motion'ın transform tabanlı (kaydırma/ölçekleme) animasyonlarını
    // otomatik devre dışı bırakır, opacity geçişleri kalır.
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gizlilik" element={<Privacy />} />
        <Route path="/kvkk" element={<Kvkk />} />
      </Routes>
    </MotionConfig>
  );
}
