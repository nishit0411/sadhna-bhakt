import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Repeat,
  Music,
  Headphones,
  Leaf,
  Flame,
  BookOpenText,
  HandHeart,
  NotebookPen,
  Flower2,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import Logo from "../components/layout/Logo";
import LanguageSwitcher from "../components/layout/LanguageSwitcher";
import DeveloperCredit from "../components/layout/DeveloperCredit";
import { useTranslation } from "../i18n/LanguageContext";
import guruPhotoMeditating from "../assets/guru-photo-1-meditating.jpeg";
import guruPhotoGarlanded from "../assets/guru-photo-2-garlanded.jpeg";
import deityPhoto from "../assets/deities-radha-krishna-balaram.jpeg";
import vrindavanAltarPhoto from "../assets/deities-vrindavan-altar.jpeg";

// Antique-gold / royal-burgundy palette, scoped to this page only — the
// rest of the app keeps its existing rose/maroon theme untouched.
const GOLD = "#b6924f";
const GOLD_SOFT = "#e3cd9a";
const GOLD_DEEP = "#8a6a2c";
const BURGUNDY = "#5c1a2b";
const BURGUNDY_DEEP = "#2e0d17";
const IVORY = "#f7f2e7";
const CHARCOAL = "#2a231d";

const ACHARYAS = [
  { photo: guruPhotoMeditating, name: "Srila Bhaktivedanta Narayana Gosvami Maharaja" },
  { photo: guruPhotoGarlanded, name: "Srila Bhaktivedanta Sridhar Goswami Maharaja" },
];

/** Gently reveals its children once scrolled into view. Respects prefers-reduced-motion via the CSS transition itself staying instant when motion is reduced (handled globally). */
function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-[1100ms] ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_LINKS = [
    { href: "#top", label: t("landing.navHome") },
    { href: "#sadhna", label: t("landing.navSadhna") },
    { href: "#thakur", label: t("landing.navSeva") },
    { href: "#sadhna", label: t("landing.navKatha") },
    { href: "#journey", label: t("landing.navProgress") },
    { href: "#footer", label: t("landing.navAbout") },
  ];

  const DAILY_CARDS = [
    { icon: Repeat, title: t("landing.cardMala"), desc: t("landing.cardMalaDesc") },
    { icon: Music, title: t("landing.cardBhajan"), desc: t("landing.cardBhajanDesc") },
    { icon: Headphones, title: t("landing.cardKatha"), desc: t("landing.cardKathaDesc") },
    { icon: Leaf, title: t("landing.cardTulsi"), desc: t("landing.cardTulsiDesc") },
    { icon: Flame, title: t("landing.cardAarti"), desc: t("landing.cardAartiDesc") },
    { icon: BookOpenText, title: t("landing.cardReading"), desc: t("landing.cardReadingDesc") },
    { icon: HandHeart, title: t("landing.cardSeva"), desc: t("landing.cardSevaDesc") },
    { icon: NotebookPen, title: t("landing.cardReflections"), desc: t("landing.cardReflectionsDesc") },
  ];

  const JOURNEY_ITEMS = [
    { icon: Flame, label: t("landing.journeyStreakLabel"), desc: t("landing.journeyStreakDesc") },
    { icon: Repeat, label: t("landing.journeyMalaLabel"), desc: t("landing.journeyMalaDesc") },
    { icon: Flower2, label: t("landing.journeySevaLabel"), desc: t("landing.journeySevaDesc") },
    { icon: BookOpenText, label: t("landing.journeyKathaLabel"), desc: t("landing.journeyKathaDesc") },
    { icon: CalendarDays, label: t("landing.journeyDaysLabel"), desc: t("landing.journeyDaysDesc") },
  ];

  return (
    <div id="top" className="min-h-screen font-sans" style={{ backgroundColor: IVORY, color: CHARCOAL }}>
      {/* ---------- Navigation ---------- */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled ? "backdrop-blur-md shadow-[0_2px_20px_rgba(46,13,23,0.08)]" : "backdrop-blur-sm"
        }`}
        style={{ backgroundColor: scrolled ? "rgba(247,242,231,0.92)" : "rgba(247,242,231,0.55)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#top" className="shrink-0">
            <Logo compact />
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-display text-[0.95rem] tracking-wide text-current opacity-80 transition-opacity hover:opacity-100"
                style={{ color: CHARCOAL }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="font-display text-sm tracking-wide opacity-80 transition-opacity hover:opacity-100"
              style={{ color: CHARCOAL }}
            >
              {t("common.login")}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-display text-sm font-semibold tracking-wide text-[#f7f2e7] shadow-[0_4px_16px_rgba(92,26,43,0.3)] transition-transform duration-300 hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${BURGUNDY}, ${BURGUNDY_DEEP})`, border: `1px solid ${GOLD_SOFT}` }}
            >
              {t("landing.navBeginSadhna")} →
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
            style={{ color: BURGUNDY }}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t px-5 pb-5 pt-2 lg:hidden" style={{ borderColor: `${GOLD}33`, backgroundColor: IVORY }}>
            <nav className="flex flex-col gap-3 pt-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-base"
                  style={{ color: CHARCOAL }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3">
              <LanguageSwitcher />
              <Link to="/login" className="font-display text-sm" style={{ color: CHARCOAL }}>
                {t("common.login")}
              </Link>
              <Link
                to="/register"
                className="rounded-full px-5 py-2 font-display text-sm font-semibold text-[#f7f2e7]"
                style={{ background: `linear-gradient(135deg, ${BURGUNDY}, ${BURGUNDY_DEEP})` }}
              >
                {t("landing.navBeginSadhna")}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 text-center sm:px-8">
        <img src={deityPhoto} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(46,13,23,0.55) 0%, rgba(46,13,23,0.72) 45%, rgba(42,35,29,0.94) 100%)`,
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "26px 26px" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-2xl pt-16">
          <p
            className="animate-fade-up font-display text-sm uppercase tracking-[0.35em]"
            style={{ color: GOLD_SOFT }}
          >
            {t("landing.hareKrishnaGreeting")}
          </p>
          <h1
            className="animate-fade-up delay-1 mt-6 text-balance font-display text-4xl font-semibold leading-[1.15] text-[#f7f2e7] sm:text-6xl"
          >
            {t("landing.heroHeadline")}
          </h1>
          <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-md text-base leading-relaxed text-[#f7f2e7]/80 sm:text-lg">
            {t("landing.heroSubhead")}
          </p>

          <div className="animate-fade-up delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center rounded-full px-8 py-3.5 font-display text-base font-semibold tracking-wide text-[#f7f2e7] shadow-[0_10px_30px_rgba(92,26,43,0.45)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
              style={{ background: `linear-gradient(135deg, ${BURGUNDY}, ${BURGUNDY_DEEP})`, border: `1px solid ${GOLD_SOFT}` }}
            >
              {t("landing.beginSadhnaButton")}
            </Link>
            <a
              href="#sadhna"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-3.5 font-display text-base font-medium tracking-wide text-[#f7f2e7] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
              style={{ borderColor: `${GOLD_SOFT}88` }}
            >
              {t("landing.exploreSadhnaButton")}
            </a>
          </div>
        </div>

        <span
          className="animate-sparkle absolute bottom-10 left-1/2 -translate-x-1/2 text-lg"
          style={{ color: GOLD_SOFT }}
          aria-hidden="true"
        >
          ✦
        </span>
      </section>

      {/* ---------- Thakur remembrance ---------- */}
      <section id="thakur" className="relative overflow-hidden px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-14 lg:grid-cols-[0.85fr_1fr]">
          <Reveal className="relative mx-auto w-full max-w-md">
            <div
              className="absolute -inset-[3px] rounded-[1.6rem]"
              style={{ background: `linear-gradient(135deg, ${GOLD_SOFT}, ${GOLD}, ${GOLD_DEEP})` }}
              aria-hidden="true"
            />
            <div
              className="relative overflow-hidden rounded-[1.45rem] border-4 border-double"
              style={{ borderColor: GOLD_SOFT, backgroundColor: BURGUNDY_DEEP, aspectRatio: "1840 / 1304" }}
            >
              <img src={vrindavanAltarPhoto} alt={t("landing.deityCaption")} className="h-full w-full object-cover" />
            </div>
          </Reveal>

          <Reveal delay={150} className="text-center lg:text-left">
            <p className="font-display text-2xl italic leading-snug sm:text-3xl" style={{ color: BURGUNDY }}>
              {t("landing.thakurEyebrow")}
            </p>
            <div className="mx-auto mt-5 h-px w-16 lg:mx-0" style={{ backgroundColor: GOLD }} />
            <p className="mx-auto mt-6 max-w-md text-base leading-[1.85rem] text-current/80 lg:mx-0" style={{ color: `${CHARCOAL}cc` }}>
              {t("landing.thakurBody")}
            </p>

            <p className="mt-10 font-display text-sm italic" style={{ color: `${CHARCOAL}99` }}>
              {t("landing.offeredAtLotusFeet")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-6 lg:justify-start">
              {ACHARYAS.map(({ photo, name }) => (
                <figure key={name} className="flex flex-col items-center gap-2.5">
                  <span
                    className="overflow-hidden rounded-xl border-2 shadow-[0_6px_20px_rgba(46,13,23,0.12)]"
                    style={{ borderColor: GOLD }}
                  >
                    <img src={photo} alt={name} className="h-36 w-28 object-cover object-top sm:h-52 sm:w-40 lg:h-64 lg:w-52" />
                  </span>
                  <figcaption className="max-w-[9rem] font-display text-sm font-bold italic leading-tight sm:max-w-[11rem] sm:text-base" style={{ color: BURGUNDY }}>
                    {name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Daily Sadhna cards ---------- */}
      <section id="sadhna" className="px-5 py-24 sm:px-8" style={{ backgroundColor: "#efe6d2" }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl" style={{ color: BURGUNDY }}>
              {t("landing.dailySadhnaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: `${CHARCOAL}99` }}>
              {t("landing.dailySadhnaSubtitle")}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DAILY_CARDS.map(({ icon: Icon, title, desc }, index) => (
              <Reveal key={title} delay={(index % 4) * 90}>
                <div
                  className="group flex h-full flex-col gap-4 rounded-2xl border bg-[#faf6ea] p-6 text-left transition-all duration-300 hover:-translate-y-1.5"
                  style={{ borderColor: `${GOLD}30`, boxShadow: "0 2px 14px rgba(46,13,23,0.06)" }}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${GOLD}1f`, color: BURGUNDY }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold" style={{ color: CHARCOAL }}>
                      {title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: `${CHARCOAL}99` }}>
                      {desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Journey / progress ---------- */}
      <section id="journey" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl" style={{ color: BURGUNDY }}>
              {t("landing.journeyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: `${CHARCOAL}99` }}>
              {t("landing.journeySubtitle")}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {JOURNEY_ITEMS.map(({ icon: Icon, label, desc }, index) => (
              <Reveal key={label} delay={index * 100} className="flex flex-col items-center gap-3 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full border"
                  style={{ borderColor: GOLD, color: BURGUNDY }}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-semibold" style={{ color: CHARCOAL }}>
                  {label}
                </h3>
                <p className="max-w-[11rem] text-xs leading-relaxed" style={{ color: `${CHARCOAL}88` }}>
                  {desc}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Cinematic quote ---------- */}
      <section className="relative overflow-hidden px-5 py-28 sm:px-8" style={{ backgroundColor: BURGUNDY_DEEP }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "30px 30px" }}
          aria-hidden="true"
        />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <span className="font-display text-3xl" style={{ color: GOLD }} aria-hidden="true">
            ✦
          </span>
          <p className="mt-6 text-balance font-display text-2xl italic leading-relaxed text-[#f7f2e7] sm:text-4xl sm:leading-[1.5]">
            {t("landing.quoteText")}
          </p>
          <div className="mx-auto mt-8 h-px w-20" style={{ backgroundColor: `${GOLD}88` }} />
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer id="footer" className="relative overflow-hidden px-5 pb-10 pt-16 sm:px-8" style={{ backgroundColor: CHARCOAL }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "28px 28px" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <p className="font-display text-xl font-semibold tracking-[0.2em]" style={{ color: GOLD_SOFT }}>
            SADHANA BHAKTI
          </p>
          <p className="max-w-sm text-sm italic" style={{ color: "#e7ded0" }}>
            {t("landing.footerTagline")}
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-display text-sm tracking-wide text-[#cfc4b3] transition-colors hover:text-[#f7f2e7]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-2 h-px w-24" style={{ backgroundColor: `${GOLD}55` }} />

          <p className="text-xs" style={{ color: "#a89b87" }}>
            {t("landing.footerClosing")}
          </p>
          <p className="text-[11px]" style={{ color: "#7d7264" }}>
            &copy; {new Date().getFullYear()} Sadhana Bhakti
          </p>
          <Link to="/admin/login" className="text-[11px] opacity-40 transition-opacity hover:opacity-80" style={{ color: "#7d7264" }}>
            {t("landing.adminLoginLink")}
          </Link>

          <DeveloperCredit dark className="mt-4" />
        </div>
      </footer>
    </div>
  );
}
