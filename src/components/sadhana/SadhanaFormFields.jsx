import { Sunrise, UtensilsCrossed, BookOpenText, Headphones, Repeat, Leaf, Music } from "lucide-react";
import { GRANTH_OPTIONS, NO_GRANTH_VALUE } from "../../data/granthList";
import { HARIKATHA_OPTIONS, NO_HARIKATHA_VALUE } from "../../data/harikathaList";
import { MALA_MIN, MALA_MAX } from "../../utils/scoring";
import { useTranslation } from "../../i18n/LanguageContext";
import SadhanaQuestion from "./SadhanaQuestion";
import YesNoSelector from "./YesNoSelector";
import CheckboxGroup from "./CheckboxGroup";
import NumberField from "./NumberField";
import TimePicker from "../ui/TimePicker";

/**
 * The full set of Sadhana question sections, shared between the Daily
 * Sadhana form and the Daily Autofill setup form so the two never drift
 * apart. Total Mala is always derived — on Asan + without Asan — never
 * entered directly.
 */
export default function SadhanaFormFields({ form, errors, setField, setMalaField }) {
  const { t } = useTranslation();
  const totalMala = (Number(form.malaOnAsan) || 0) + (Number(form.malaWithoutAsan) || 0);

  return (
    <>
      <SadhanaQuestion icon={Sunrise} title={t("sadhana.morningTitle")}>
        <div className="mb-4" data-error={Boolean(errors.wakeUpTime)}>
          <TimePicker
            label={t("sadhana.wakeUpTime")}
            required
            name="wakeUpTime"
            value={form.wakeUpTime}
            onChange={(e) => setField("wakeUpTime", e.target.value)}
          />
        </div>
        <p className="mb-4 text-sm leading-relaxed text-brown-700 sm:text-base">
          {t("sadhana.jaiDhwaniQuestion")}
          <span className="ml-0.5 text-maroon-500">*</span>
        </p>
        <div data-error={Boolean(errors.gurudevRemembrance)}>
          <YesNoSelector name="gurudevRemembrance" value={form.gurudevRemembrance} onChange={(v) => setField("gurudevRemembrance", v)} />
          {errors.gurudevRemembrance && <p className="mt-2 text-xs text-clay-600">{errors.gurudevRemembrance}</p>}
        </div>

        <div className="mt-5 border-t border-brown-900/5 pt-5">
          <p className="mb-3 text-sm leading-relaxed text-brown-700 sm:text-base">
            {t("sadhana.mangalaAratiQuestion")}
            <span className="ml-0.5 text-maroon-500">*</span>
          </p>
          <div data-error={Boolean(errors.mangalaAratiDone)}>
            <YesNoSelector name="mangalaAratiDone" value={form.mangalaAratiDone} onChange={(v) => setField("mangalaAratiDone", v)} />
            {errors.mangalaAratiDone && <p className="mt-2 text-xs text-clay-600">{errors.mangalaAratiDone}</p>}
          </div>
        </div>
      </SadhanaQuestion>

      <SadhanaQuestion icon={UtensilsCrossed} title={t("sadhana.bhogTitle")} question={t("sadhana.bhogQuestion")}>
        <div data-error={Boolean(errors.bhogOffered)}>
          <YesNoSelector name="bhogOffered" value={form.bhogOffered} onChange={(v) => setField("bhogOffered", v)} />
          {errors.bhogOffered && <p className="mt-2 text-xs text-clay-600">{errors.bhogOffered}</p>}
        </div>
      </SadhanaQuestion>

      <SadhanaQuestion icon={BookOpenText} title={t("sadhana.granthTitle")} question={t("sadhana.granthQuestion")}>
        <div data-error={Boolean(errors.granthRead)}>
          <CheckboxGroup
            name="granthRead"
            options={GRANTH_OPTIONS}
            values={form.granthRead}
            onChange={(v) => setField("granthRead", v)}
            exclusiveValue={NO_GRANTH_VALUE}
            otherValue="Other"
            otherText={form.granthOther}
            onOtherTextChange={(v) => setField("granthOther", v)}
            otherLabel={t("sadhana.granthOtherLabel")}
            otherPlaceholder={t("sadhana.granthOtherPlaceholder")}
          />
          {errors.granthRead && <p className="mt-2 text-xs text-clay-600">{errors.granthRead}</p>}
          {errors.granthOther && <p className="mt-2 text-xs text-clay-600">{errors.granthOther}</p>}
        </div>
      </SadhanaQuestion>

      <SadhanaQuestion icon={Headphones} title={t("sadhana.harikathaTitle")} question={t("sadhana.harikathaQuestion")}>
        <div data-error={Boolean(errors.harikathaSources)}>
          <CheckboxGroup
            name="harikathaSources"
            options={HARIKATHA_OPTIONS}
            values={form.harikathaSources}
            onChange={(v) => setField("harikathaSources", v)}
            exclusiveValue={NO_HARIKATHA_VALUE}
            otherValue="Other"
            otherText={form.harikathaOther}
            onOtherTextChange={(v) => setField("harikathaOther", v)}
            otherLabel={t("sadhana.harikathaOtherLabel")}
            otherPlaceholder={t("sadhana.harikathaOtherPlaceholder")}
          />
          {errors.harikathaSources && <p className="mt-2 text-xs text-clay-600">{errors.harikathaSources}</p>}
          {errors.harikathaOther && <p className="mt-2 text-xs text-clay-600">{errors.harikathaOther}</p>}
        </div>
      </SadhanaQuestion>

      <SadhanaQuestion icon={Music} title={t("sadhana.kirtanTitle")} question={t("sadhana.kirtanQuestion")}>
        <div data-error={Boolean(errors.gaudiyaKirtan)}>
          <YesNoSelector name="gaudiyaKirtan" value={form.gaudiyaKirtan} onChange={(v) => setField("gaudiyaKirtan", v)} />
          {errors.gaudiyaKirtan && <p className="mt-2 text-xs text-clay-600">{errors.gaudiyaKirtan}</p>}
        </div>
      </SadhanaQuestion>

      <SadhanaQuestion icon={Repeat} title={t("sadhana.malaTitle")} question={t("sadhana.malaQuestion")} required={false}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-error={Boolean(errors.malaOnAsan)}>
            <NumberField
              label={t("sadhana.malaOnAsanLabel")}
              name="malaOnAsan"
              value={form.malaOnAsan}
              onChange={(v) => setMalaField("malaOnAsan", v)}
              error={errors.malaOnAsan}
              min={MALA_MIN}
              max={MALA_MAX}
            />
          </div>
          <div data-error={Boolean(errors.malaWithoutAsan)}>
            <NumberField
              label={t("sadhana.malaWithoutAsanLabel")}
              name="malaWithoutAsan"
              value={form.malaWithoutAsan}
              onChange={(v) => setMalaField("malaWithoutAsan", v)}
              error={errors.malaWithoutAsan}
              min={MALA_MIN}
              max={MALA_MAX}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-cream-50 px-4 py-3">
          <span className="text-sm font-medium text-brown-700">{t("sadhana.totalMalaLabel")}</span>
          <span className="font-display text-xl font-semibold text-maroon-600">{totalMala}</span>
        </div>
        <p className="mt-1.5 text-xs text-brown-500">{t("sadhana.totalMalaHelper")}</p>
      </SadhanaQuestion>

      <SadhanaQuestion icon={Leaf} title={t("sadhana.tulsiTitle")} question={t("sadhana.tulsiQuestion")}>
        <div data-error={Boolean(errors.tulsiSeva)}>
          <YesNoSelector name="tulsiSeva" value={form.tulsiSeva} onChange={(v) => setField("tulsiSeva", v)} />
          {errors.tulsiSeva && <p className="mt-2 text-xs text-clay-600">{errors.tulsiSeva}</p>}
        </div>
      </SadhanaQuestion>
    </>
  );
}
