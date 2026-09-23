import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CalendarDays, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import * as sadhanaService from "../../services/sadhanaService";
import * as autofillService from "../../services/autofillService";
import { formatLongDate, toISODate, addDays } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import SadhanaFormFields from "../../components/sadhana/SadhanaFormFields";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingState from "../../components/ui/LoadingState";
import Logo from "../../components/layout/Logo";

function buildFormFromEntry(entry) {
  return {
    wakeUpTime: entry?.wakeUpTime ?? "05:30",
    gurudevRemembrance: entry?.gurudevRemembrance ?? null,
    mangalaAratiDone: entry?.mangalaAratiDone ?? null,
    bhogOffered: entry?.bhogOffered ?? null,
    granthRead: entry?.granthRead ?? [],
    granthOther: entry?.granthOther ?? "",
    harikathaSources: entry?.harikathaSources ?? [],
    harikathaOther: entry?.harikathaOther ?? "",
    gaudiyaKirtan: entry?.gaudiyaKirtan ?? null,
    malaOnAsan: entry?.malaOnAsan ?? 0,
    malaWithoutAsan: entry?.malaWithoutAsan ?? 0,
    tulsiSeva: entry?.tulsiSeva ?? null,
  };
}

export default function DailySadhana() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const today = toISODate(new Date());
  // Devotees can only submit/edit these 3 days — mirrors the DB-enforced
  // window in schema.sql §15 (Asia/Kolkata-anchored), so the UI never even
  // offers a date the database would reject.
  const dayOptions = [
    { key: "today", date: today, label: t("sadhana.dayToday") },
    { key: "yesterday", date: addDays(today, -1), label: t("sadhana.dayYesterday") },
    { key: "dayBefore", date: addDays(today, -2), label: t("sadhana.dayBeforeYesterday") },
  ];

  const [selectedDate, setSelectedDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntryLoading, setIsEntryLoading] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [form, setForm] = useState(() => buildFormFromEntry(null));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasAutofillTemplate, setHasAutofillTemplate] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    let active = true;
    autofillService
      .getAutofillTemplate(user.id)
      .then((template) => {
        if (active) setHasAutofillTemplate(Boolean(template));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    let active = true;
    if (hasLoadedOnceRef.current) setIsEntryLoading(true);
    sadhanaService
      .getEntryByDate(user.id, selectedDate)
      .then((entry) => {
        if (!active) return;
        setForm(buildFormFromEntry(entry));
        setIsEditingExisting(Boolean(entry));
        setSubmitted(false);
        setErrors({});
      })
      .catch((err) => {
        if (!active) return;
        addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        setIsEntryLoading(false);
        hasLoadedOnceRef.current = true;
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, selectedDate]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function setMalaField(field, value) {
    // Empty input defaults to 0 — Mala fields are never left blank/null.
    setField(field, value === "" ? 0 : value);
  }

  async function handleUseAutofill() {
    try {
      const template = await autofillService.getAutofillTemplate(user.id);
      if (!template) return;
      const { updatedAt, ...values } = template;
      // Only fills the fields — never submits, and today's date is untouched.
      setForm((prev) => ({ ...prev, ...values }));
      setErrors({});
      addToast(t("autofill.appliedToast"));
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    }
  }

  function validate() {
    const next = {};
    if (!form.wakeUpTime) next.wakeUpTime = t("sadhana.errWakeUpTime");
    if (form.gurudevRemembrance === null) next.gurudevRemembrance = t("sadhana.errAnswer");
    if (form.mangalaAratiDone === null) next.mangalaAratiDone = t("sadhana.errAnswer");
    if (form.bhogOffered === null) next.bhogOffered = t("sadhana.errAnswer");

    if (!form.granthRead.length) next.granthRead = t("sadhana.errSelectOne");
    else if (form.granthRead.includes("Other") && !form.granthOther.trim())
      next.granthOther = t("sadhana.errSpecifyGranth");

    if (!form.harikathaSources.length) next.harikathaSources = t("sadhana.errSelectOne");
    else if (form.harikathaSources.includes("Other") && !form.harikathaOther.trim())
      next.harikathaOther = t("sadhana.errSpecify");

    if (form.gaudiyaKirtan === null) next.gaudiyaKirtan = t("sadhana.errAnswer");

    if (form.tulsiSeva === null) next.tulsiSeva = t("sadhana.errAnswer");

    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      addToast(t("sadhana.errPleaseComplete"), "error");
      const firstError = document.querySelector("[data-error='true']");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const malaOnAsan = Number(form.malaOnAsan) || 0;
    const malaWithoutAsan = Number(form.malaWithoutAsan) || 0;

    setIsSubmitting(true);
    try {
      await sadhanaService.submitSadhana(user.id, selectedDate, {
        name: user.name,
        wakeUpTime: form.wakeUpTime,
        gurudevRemembrance: form.gurudevRemembrance,
        mangalaAratiDone: form.mangalaAratiDone,
        bhogOffered: form.bhogOffered,
        granthRead: form.granthRead,
        granthOther: form.granthRead.includes("Other") ? form.granthOther.trim() : "",
        harikathaSources: form.harikathaSources,
        harikathaOther: form.harikathaSources.includes("Other") ? form.harikathaOther.trim() : "",
        gaudiyaKirtan: form.gaudiyaKirtan,
        malaOnAsan,
        malaWithoutAsan,
        totalMala: malaOnAsan + malaWithoutAsan,
        tulsiSeva: form.tulsiSeva,
      });
      setSubmitted(true);
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingState fullHeight />;

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100 text-3xl">🙏</span>
        <div>
          <p className="text-lg font-medium text-brown-800">
            {isEditingExisting ? t("sadhana.successUpdated") : t("sadhana.successSubmitted")} 🙏
          </p>
        </div>
        <Button size="lg" onClick={() => navigate(user.role === "mentor" ? "/mentor/dashboard" : "/devotee/dashboard")}>
          {t("sadhana.hareKrishnaButton")} 🙏
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-5 font-display text-2xl font-semibold uppercase tracking-wide text-maroon-600 sm:text-3xl">
          {t("sadhana.pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-brown-600">{t("sadhana.guidance")}</p>
        <p className="mt-1 text-xs italic text-saffron-600">{t("sadhana.blessings")}</p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-beige-100 px-4 py-1.5 text-sm font-medium text-brown-700">
          <CalendarDays className="h-4 w-4 text-maroon-500" />
          {formatLongDate(selectedDate, locale)}
          {isEditingExisting && <span className="text-xs font-normal text-saffron-600">· {t("sadhana.editingToday")}</span>}
        </span>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-cream-100 p-1 text-xs font-medium">
          {dayOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={isEntryLoading}
              onClick={() => setSelectedDate(opt.date)}
              className={`rounded-full px-3 py-1.5 transition-colors disabled:opacity-60 ${
                selectedDate === opt.date ? "bg-maroon-500 text-cream-50" : "text-brown-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-5 flex flex-col gap-3 border-2 border-dashed border-saffron-300 bg-saffron-50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Wand2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-maroon-600">{t("autofill.sectionTitle")}</p>
            <p className="text-xs text-brown-600">
              {hasAutofillTemplate ? t("autofill.sectionHint") : t("autofill.noneSavedHint")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/devotee/sadhana/autofill" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full">
              {t("autofill.setUpdateButton")}
            </Button>
          </Link>
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" disabled={!hasAutofillTemplate} onClick={handleUseAutofill}>
            {t("autofill.useButton")}
          </Button>
        </div>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <SadhanaFormFields form={form} errors={errors} setField={setField} setMalaField={setMalaField} />

        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-brown-900/5 bg-cream-50/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <Button type="submit" size="lg" isLoading={isSubmitting} icon={Sparkles} className="w-full">
            {isEditingExisting ? t("sadhana.updateButton") : t("sadhana.submitButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
