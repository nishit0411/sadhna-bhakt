import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import * as autofillService from "../../services/autofillService";
import SadhanaFormFields from "../../components/sadhana/SadhanaFormFields";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import Logo from "../../components/layout/Logo";

function blankTemplate() {
  return {
    wakeUpTime: "05:30",
    gurudevRemembrance: null,
    mangalaAratiDone: null,
    bhogOffered: null,
    granthRead: [],
    granthOther: "",
    harikathaSources: [],
    harikathaOther: "",
    gaudiyaKirtan: null,
    malaOnAsan: 0,
    malaWithoutAsan: 0,
    tulsiSeva: null,
  };
}

export default function AutofillSetup() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(blankTemplate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    autofillService.getAutofillTemplate(user.id).then((template) => {
      if (!active) return;
      if (template) {
        const { updatedAt, ...values } = template;
        setForm({ ...blankTemplate(), ...values });
      }
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setMalaField(field, value) {
    setField(field, value === "" ? 0 : value);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await autofillService.saveAutofillTemplate(user.id, form);
      addToast(t("autofill.savedToast"));
      navigate("/devotee/sadhana");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState fullHeight />;

  return (
    <div className="pb-28 lg:pb-6">
      <button
        onClick={() => navigate("/devotee/sadhana")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brown-500 hover:text-maroon-600"
      >
        <ArrowLeft className="h-4 w-4" /> {t("autofill.backToDailySadhana")}
      </button>

      <div className="mb-6 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-5 font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">{t("autofill.pageTitle")}</h1>
        <p className="mt-2 max-w-md text-sm text-brown-600">{t("autofill.pageSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-5">
        <SadhanaFormFields form={form} errors={{}} setField={setField} setMalaField={setMalaField} />

        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-brown-900/5 bg-cream-50/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <Button size="lg" isLoading={isSaving} className="w-full" onClick={handleSave}>
            {t("autofill.saveButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
