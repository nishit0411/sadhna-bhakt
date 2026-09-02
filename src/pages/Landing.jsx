import { Link } from "react-router-dom";
import { BookOpenText, Flame, LineChart, Repeat } from "lucide-react";
import Logo from "../components/layout/Logo";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LanguageSwitcher from "../components/layout/LanguageSwitcher";
import { useTranslation } from "../i18n/LanguageContext";
import guruPhotoMeditating from "../assets/guru-photo-1-meditating.jpeg";
import guruPhotoGarlanded from "../assets/guru-photo-2-garlanded.jpeg";

const ACHARYAS = [
  { photo: guruPhotoMeditating, name: "Srila Bhaktivedanta Narayana Gosvami Maharaja" },
  { photo: guruPhotoGarlanded, name: "Srila Bhaktivedanta Sridhar Goswami Maharaja" },
];

export default function Landing() {
  const { t } = useTranslation();

  const REASONS = [
    { icon: Repeat, title: t("landing.reason1Title"), description: t("landing.reason1Body") },
    { icon: Flame, title: t("landing.reason2Title"), description: t("landing.reason2Body") },
    { icon: BookOpenText, title: t("landing.reason3Title"), description: t("landing.reason3Body") },
    { icon: LineChart, title: t("landing.reason4Title"), description: t("landing.reason4Body") },
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/login">
            <Button variant="outline" size="sm">
              {t("common.login")}
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-16 pt-8 text-center sm:px-6 sm:pt-14">
        <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-2xl">
          <p className="font-display text-base text-saffron-600 sm:text-lg">{t("landing.hareKrishnaGreeting")}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-maroon-600 sm:text-4xl">{t("landing.title")}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brown-600 sm:text-base">{t("landing.subtitle")}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {t("landing.startButton")}
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t("landing.loginButton")}
              </Button>
            </Link>
          </div>

          <div className="mt-8">
            <LanguageSwitcher variant="prominent" />
          </div>
        </div>

        <div className="relative mx-auto mt-12 flex max-w-xl flex-col items-center gap-3">
          <p className="font-display text-sm italic text-brown-500">{t("landing.offeredAtLotusFeet")}</p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            {ACHARYAS.map(({ photo, name }) => (
              <figure key={name} className="flex flex-col items-center gap-3">
                <span className="overflow-hidden rounded-2xl border-[6px] border-double border-maroon-400 bg-beige-100 shadow-lifted ring-2 ring-saffron-200 ring-offset-2 ring-offset-cream-50">
                  <img
                    src={photo}
                    alt={name}
                    className="h-56 w-44 object-cover object-top sm:h-64 sm:w-48"
                  />
                </span>
                <figcaption className="max-w-[13rem] font-display text-sm font-bold italic text-maroon-600 sm:max-w-[15rem] sm:text-base">
                  {name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">{t("landing.whyTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex flex-col items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-display text-base font-semibold text-brown-900">{title}</h3>
              <p className="text-sm leading-relaxed text-brown-500">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-brown-900/5 px-4 py-8 text-center text-sm text-brown-500 sm:px-6">
        <div className="flex justify-center">
          <Logo compact />
        </div>
        <p className="mt-3">{t("landing.footerText")}</p>
        <p className="mt-1 text-xs text-brown-400">&copy; {new Date().getFullYear()} Sadhana Bhakti. {t("landing.footerCopyright")}</p>
      </footer>
    </div>
  );
}
