import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Kvkk from "./pages/Kvkk";
import ScrollProgress from "./components/ScrollProgress";
import BackToTop from "./components/BackToTop";

export default function App() {
  const location = useLocation();

  return (
    // reducedMotion="user": prefers-reduced-motion açık ziyaretçilerde
    // framer-motion'ın transform tabanlı (kaydırma/ölçekleme) animasyonlarını
    // otomatik devre dışı bırakır, opacity geçişleri kalır.
    <MotionConfig reducedMotion="user">
      <ScrollProgress />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/gizlilik" element={<Privacy />} />
            <Route path="/kvkk" element={<Kvkk />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <BackToTop />
    </MotionConfig>
  );
}
