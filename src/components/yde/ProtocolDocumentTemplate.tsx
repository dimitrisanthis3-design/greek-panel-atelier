import type { ReactNode } from "react";
import type { DocCheck, ProtocolDoc, ProtocolRow } from "@/lib/protocol";
import {
  CHECK_RESULT_LABELS,
  INSTALLATION_USE_CATEGORIES,
  RECHECK_YEARS,
  installationUseInfo,
  type CheckKind,
  type CheckResult,
  type EarthType,
  type Network,
  type OwnerRole,
  type ProtocolConclusion,
} from "@/lib/yde";

const ON = "☑";
const OFF = "☐";
const value = (text: string, count = 10) => text.trim() || "…".repeat(count);
const tdClass = "border border-black px-1 py-[0.5px] align-top";
const tableClass = "protocol-table w-full border-collapse border border-black";

function box(checked: boolean, label: string, onToggle: () => void) {
  return <ToggleBox checked={checked} label={label} onToggle={onToggle} />;
}

export interface ProtocolDocumentHandlers {
  onOwnerRoleChange: (role: OwnerRole) => void;
  onCheckKindChange: (kind: CheckKind) => void;
  onNetworkChange: (network: Network) => void;
  onCheckChange: (id: string, result: CheckResult) => void;
  onEarthTypeChange: (earthType: EarthType) => void;
  onLabelAffixedChange: (labelAffixed: boolean) => void;
  onConclusionChange: (conclusion: ProtocolConclusion) => void;
}

function ToggleBox({
  checked,
  label,
  onToggle,
  mark,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  mark?: string;
}) {
  return (
    <button
      type="button"
      className="protocol-mark inline-flex h-[1em] min-w-[1em] cursor-pointer items-center justify-center border-0 bg-transparent p-0 align-middle font-normal leading-none text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-700 print:appearance-none"
      aria-label={label}
      aria-pressed={checked}
      title={`${label}: ${checked ? "επιλεγμένο" : "μη επιλεγμένο"}`}
      onClick={onToggle}
    >
      {mark ?? (checked ? ON : OFF)}
    </button>
  );
}

function Td({
  children,
  className = "",
  colSpan,
  rowSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`${tdClass} ${className}`}>
      {children}
    </td>
  );
}

function Page({ children, page }: { children: ReactNode; page: number }) {
  return (
    <section className="protocol-page mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[9mm] py-[7mm] font-[Arial,Helvetica,sans-serif] text-[8pt] leading-tight text-black shadow-sheet">
      {page === 1 ? (
        <p className="mb-1 flex items-baseline gap-2 text-[9pt] font-bold">
          <span className="flex-1 text-center">
            Πρωτόκολλο Ελέγχου Εσωτερικής Ηλεκτρικής Εγκατάστασης κατά ΕΛΟΤ HD 384
          </span>
          <span className="whitespace-nowrap text-[7pt] font-normal">Σελίδα 1 από 2</span>
        </p>
      ) : (
        <p className="mb-1 text-right text-[7pt]">Σελίδα 2 από 2</p>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function Mark({
  check,
  onCheckChange,
}: {
  check: DocCheck;
  onCheckChange: ProtocolDocumentHandlers["onCheckChange"];
}) {
  const nextResult: Record<CheckResult, CheckResult> = {
    ok: "fail",
    fail: "na",
    na: "none",
    none: "ok",
  };
  return (
    <span className="whitespace-nowrap">
      <ToggleBox
        checked={check.result !== "none"}
        label={`${check.id} ${check.label}: ${CHECK_RESULT_LABELS[check.result]}`}
        mark={
          check.result === "ok"
            ? ON
            : check.result === "fail"
              ? "☒"
              : check.result === "na"
                ? "—"
                : OFF
        }
        onToggle={() => onCheckChange(check.id, nextResult[check.result])}
      />
    </span>
  );
}

/** The visual checks are arranged in three vertical columns, as in the reference form. */
function VisualChecks({
  checks,
  remarks,
  onCheckChange,
}: {
  checks: DocCheck[];
  remarks: string;
  onCheckChange: ProtocolDocumentHandlers["onCheckChange"];
}) {
  const columns = [checks.slice(0, 4), checks.slice(4, 8), checks.slice(8, 12)];
  return (
    <table className={tableClass}>
      <tbody>
        <tr className="font-bold">
          <Td className="text-[9pt]">1. Οπτικός έλεγχος:</Td>
          <Td className="w-[9%] text-center text-[5.5pt]">Συμμόρφωση</Td>
          <Td className="text-center text-[6pt]">Συμμόρφωση</Td>
          <Td />
          <Td className="text-center text-[6pt]">Συμμόρφωση</Td>
          <Td />
        </tr>
        {Array.from({ length: 4 }, (_, row) => (
          <tr key={row}>
            {columns.map((column, col) => {
              const check = column[row];
              return (
                <FragmentCheck
                  key={check?.id ?? `blank-${col}-${row}`}
                  check={check}
                  onCheckChange={onCheckChange}
                />
              );
            })}
          </tr>
        ))}
        <tr>
          <Td colSpan={6} className="h-[7mm] text-[8pt]">
            Παρατηρήσεις:{" "}
            {remarks ||
              "........................................................................................................................"}
          </Td>
        </tr>
      </tbody>
    </table>
  );
}

function FragmentCheck({
  check,
  onCheckChange,
}: {
  check: DocCheck | undefined;
  onCheckChange: ProtocolDocumentHandlers["onCheckChange"];
}) {
  return (
    <>
      <Td className="w-[24%] text-[6.5pt]">{check ? `${check.id}. ${check.label}` : ""}</Td>
      <Td className="w-[9%] text-center text-[9pt]">
        {check ? <Mark check={check} onCheckChange={onCheckChange} /> : ""}
      </Td>
    </>
  );
}

function TestChecks({
  checks,
  onCheckChange,
}: {
  checks: DocCheck[];
  onCheckChange: ProtocolDocumentHandlers["onCheckChange"];
}) {
  const columns = [checks.slice(0, 2), checks.slice(2, 4), checks.slice(4, 6)];
  return (
    <table className={tableClass}>
      <tbody>
        <tr className="font-bold">
          <Td className="text-[9pt]">2. Δοκιμές:</Td>
          <Td className="w-[9%] text-center text-[5.5pt]">Συμμόρφωση</Td>
          <Td className="text-center text-[6pt]">Συμμόρφωση</Td>
          <Td />
          <Td className="text-center text-[6pt]">Συμμόρφωση</Td>
          <Td />
        </tr>
        {Array.from({ length: 2 }, (_, row) => (
          <tr key={row}>
            {columns.map((column, col) => (
              <FragmentCheck
                key={column[row]?.id ?? `test-${col}-${row}`}
                check={column[row]}
                onCheckChange={onCheckChange}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CircuitHead() {
  const vertical = "[writing-mode:vertical-rl] rotate-180 mx-auto";
  return (
    <thead className="text-center text-[6pt] leading-tight">
      <tr>
        <Td rowSpan={2} className="w-[4%] align-middle">
          <span className={vertical}>Αρ. Ηλεκτρικού Κυκλώματος</span>
        </Td>
        <Td rowSpan={2} className="w-[27%] align-middle text-[7pt]">
          Χώρος / Τμήμα εγκατάστασης, Χρήση
        </Td>
        <Td colSpan={3} className="align-middle text-[7pt]">
          Γραμμή τροφοδοσίας / καλώδιο
        </Td>
        <Td colSpan={2}>3.2 Αντίσταση μόνωσης Riso (MΩ) (άρθρα 612.3 &amp; 612.4)</Td>
        <Td colSpan={2} className="align-middle text-[6.5pt]">
          Διάταξη προστασίας από υπερένταση
        </Td>
        <Td colSpan={4}>3.3 Διάταξη διαφορικού ρεύματος (RCD) (παράρτημα Π.61-Β)</Td>
        <Td>3.4 Βρόχος σφάλματος (παράγραφος 612.6.3 &amp; παράρτημα Π.61-Δ)</Td>
      </tr>
      <tr>
        <Td className="w-[6%] align-middle">Τύπος καλωδίου</Td>
        <Td className="w-[4%]">
          <span className={vertical}>Αριθ. Αγωγών</span>
        </Td>
        <Td className="w-[4.5%]">
          <span className={vertical}>Διατομή αγωγού mm²</span>
        </Td>
        <Td className="w-[4.5%]">
          <span className={vertical}>Με καταναλώσεις</span>
        </Td>
        <Td className="w-[4.5%]">
          <span className={vertical}>Χωρίς καταναλώσεις</span>
        </Td>
        <Td className="w-[9%] align-middle">Είδος / Χαρακτηριστική</Td>
        <Td className="w-[3.5%] align-middle">
          I<sub>n</sub> (A)
        </Td>
        <Td className="w-[7%] align-middle">
          Ονομαστικό ρεύμα I<sub>n</sub> (A) &amp; τύπος
        </Td>
        <Td className="w-[4.5%] align-middle">
          I<sub>ΔN</sub> (mA)
        </Td>
        <Td className="w-[4.5%] align-middle">
          I<sub>mess</sub> (mA)
        </Td>
        <Td className="w-[4.5%] align-middle">
          U<sub>mess</sub> (V)
        </Td>
        <Td className="w-[8.5%] align-middle">
          Z<sub>s</sub> (Ω) ή I<sub>k</sub> (A)
        </Td>
      </tr>
    </thead>
  );
}

function MeasurementRow({ row }: { row: ProtocolRow }) {
  return (
    <tr className="h-[4.5mm] text-center text-[7pt]">
      <Td>{row.no}</Td>
      <Td className="text-left">{row.use}</Td>
      <Td>{row.cableType}</Td>
      <Td>{row.conductors}</Td>
      <Td>{row.section}</Td>
      <Td>{row.risoLoad}</Td>
      <Td>{row.riso}</Td>
      <Td>{row.kind}</Td>
      <Td>{row.amps}</Td>
      <Td />
      <Td />
      <Td>{row.imess}</Td>
      <Td>{row.umess}</Td>
      <Td>{row.zs}</Td>
    </tr>
  );
}

function InstallerStamp({ lines, image }: { lines: string[]; image: string }) {
  if (!lines.length && !image) {
    return <div className="h-[24mm] w-[72mm] border border-dashed border-black" />;
  }
  return (
    <div className="inline-block min-w-[72mm] border border-blue-900 px-2 py-1 text-center font-bold leading-tight text-blue-900">
      {image && (
        <img
          src={image}
          alt="Ψηφιακή σφραγίδα και υπογραφή εγκαταστάτη"
          className="mx-auto mb-1 max-h-[17mm] max-w-full object-contain mix-blend-multiply"
        />
      )}
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          className={index === 0 ? "text-[10pt] tracking-[0.25em]" : "text-[6.5pt]"}
        >
          {line}
        </div>
      ))}
      <div className="mt-1 text-[6pt] font-normal">Σφραγίδα - Υπογραφή</div>
    </div>
  );
}

export function ProtocolDocumentTemplate({
  doc,
  onOwnerRoleChange,
  onCheckKindChange,
  onNetworkChange,
  onCheckChange,
  onEarthTypeChange,
  onLabelAffixedChange,
  onConclusionChange,
}: ProtocolDocumentHandlers & { doc: ProtocolDoc }) {
  const i = doc.installer;
  const visualRows = doc.visualChecks;
  const testRows = doc.testChecks;
  const measureRows = doc.measureChecks;
  const useInfo = installationUseInfo(doc.installCategory);
  const recheckCategory = useInfo?.category ?? "A";
  const recheckInterval = useInfo?.years ?? RECHECK_YEARS;
  const passes =
    doc.conclusion === "safe"
      ? true
      : doc.conclusion === "unsafe" || doc.conclusion === "none"
        ? false
        : doc.passes;
  const conclusionText =
    doc.conclusion === "none"
      ? "δεν έχει επιλεγεί συμπέρασμα"
      : passes
        ? "ανταποκρίνεται"
        : "δεν ανταποκρίνεται";
  const safeChecked = doc.conclusion === "safe" || (doc.conclusion === "auto" && doc.passes);
  const unsafeChecked = doc.conclusion === "unsafe" || (doc.conclusion === "auto" && !doc.passes);

  return (
    <div className="space-y-6 print:space-y-0">
      <Page page={1}>
        <table className={tableClass}>
          <tbody>
            <tr>
              <Td className="w-[33%]">
                <b className="text-[9pt]">Πρωτόκολλο ελέγχου Νο {value(doc.protocolNo, 6)}</b>
                <br />
                <i className="text-[6.5pt]">με βάση την κείμενη νομοθεσία</i>
              </Td>
              <Td className="w-[37%] text-center">
                Ιδιοκτήτης{" "}
                {box(doc.ownerRole === "owner", "Ιδιοκτήτης", () =>
                  onOwnerRoleChange(doc.ownerRole === "owner" ? "none" : "owner"),
                )}{" "}
                &nbsp;&nbsp; Καταναλωτής{" "}
                {box(doc.ownerRole === "consumer", "Καταναλωτής", () =>
                  onOwnerRoleChange(doc.ownerRole === "consumer" ? "none" : "consumer"),
                )}
                <div className="mt-1 font-bold">{value(doc.owner, 4)}</div>
              </Td>
              <Td className="text-[7pt]">
                <b>Αρ. παροχής:</b> &nbsp;{doc.supplyNo}
                <br />
                <b>Διεύθυνση:</b> &nbsp;{doc.address}
                <br />
                <span className="pl-8">{doc.cityLine}</span>
              </Td>
            </tr>
            <tr>
              <Td rowSpan={2} className="w-[33%] text-[7pt]">
                <b>Αρχικός έλεγχος (*)</b>{" "}
                {box(doc.checkKind === "initial", "Αρχικός έλεγχος", () =>
                  onCheckKindChange(doc.checkKind === "initial" ? "none" : "initial"),
                )}
                <br />
                <b>Τακτικός επανέλεγχος</b>{" "}
                {box(doc.checkKind === "periodic", "Τακτικός επανέλεγχος", () =>
                  onCheckKindChange(doc.checkKind === "periodic" ? "none" : "periodic"),
                )}
                <br />
                <b>Έκτακτος έλεγχος</b>{" "}
                {box(doc.checkKind === "extraordinary", "Έκτακτος έλεγχος", () =>
                  onCheckKindChange(doc.checkKind === "extraordinary" ? "none" : "extraordinary"),
                )}
                <br />
                <b>
                  <i>Αιτία έκτακτου ελέγχου:</i>
                </b>
                <br />
                {doc.extraReason ||
                  "................................................................"}
                <br />
                <span className="text-[5.5pt]">
                  (*) Με τους περιορισμούς της παραγράφου 5 του άρθρου 6
                </span>
              </Td>
              <Td className="text-center">
                <b>Ηλεκτρολόγος εγκαταστάτης</b>
                <div className="mt-2 text-[10pt] font-bold">{value(i.name, 4)}</div>
              </Td>
              <Td className="text-[7pt]">
                Αριθμός Αδείας {i.licenseNo}
                <br />
                Βεβ. Αναγγελίας {i.announcementNo}
                <br />
                Κατηγορία: {i.category}
                <br />
                Ειδικότητα: {i.specialty}
              </Td>
            </tr>
            <tr>
              <Td colSpan={2} className="font-bold">
                Χρήση εγκατάστασης: &nbsp; {doc.installCategory} &nbsp; Κωδ. {doc.installCode}
              </Td>
            </tr>
            <tr>
              <Td className="text-[8pt]">Ονομαστική τάση: &nbsp; {doc.voltage} (V)</Td>
              <Td colSpan={2} className="text-[7pt]">
                Δίκτυο τροφοδοσίας: &nbsp;&nbsp; TT-Σύστημα{" "}
                {box(doc.network === "TT", "TT", () =>
                  onNetworkChange(doc.network === "TT" ? "none" : "TT"),
                )}{" "}
                &nbsp;&nbsp; TN-S-Σύστημα{" "}
                {box(doc.network === "TNS", "TN-S", () =>
                  onNetworkChange(doc.network === "TNS" ? "none" : "TNS"),
                )}{" "}
                &nbsp;&nbsp; TN-C-S-Σύστημα{" "}
                {box(doc.network === "TNCS", "TN-C-S", () =>
                  onNetworkChange(doc.network === "TNCS" ? "none" : "TNCS"),
                )}{" "}
                &nbsp;&nbsp; IT-Σύστημα{" "}
                {box(doc.network === "IT", "IT", () =>
                  onNetworkChange(doc.network === "IT" ? "none" : "IT"),
                )}
              </Td>
            </tr>
          </tbody>
        </table>

        <VisualChecks
          checks={visualRows}
          remarks={doc.remarksVisual}
          onCheckChange={onCheckChange}
        />
        <TestChecks checks={testRows} onCheckChange={onCheckChange} />
        <table className={tableClass}>
          <tbody>
            <tr>
              <Td className="w-[33%]">
                <div className="flex justify-between font-bold">
                  <span className="text-[9pt]">3. Μετρήσεις:</span>
                  <span className="text-[6pt]">Συμμόρφωση</span>
                </div>
                {measureRows.map((check) => (
                  <p key={check.id} className="flex justify-between text-[6.5pt]">
                    <span>
                      {check.id}. {check.label}
                    </span>
                    <Mark check={check} onCheckChange={onCheckChange} />
                  </p>
                ))}
              </Td>
              <Td className="text-[8pt]">Παρατηρήσεις: {doc.remarksMeasure}</Td>
            </tr>
            <tr>
              <Td>
                <div>3.5. Αντίσταση ηλεκτροδίου γείωσης</div>
                <div className="text-[5.5pt]">(παράγραφος 612.6.2 &amp; παράρτημα Π.61-Γ)</div>
                <div className="text-right text-[10pt]">{doc.earthOhms || "………"} Ω</div>
              </Td>
              <Td>
                Είδος γείωσης: &nbsp;
                {doc.earthTypes.map((earth) => (
                  <span key={earth.key} className="mr-3">
                    {earth.label}{" "}
                    {box(doc.earthType === earth.key, earth.label, () =>
                      onEarthTypeChange(doc.earthType === earth.key ? "none" : earth.key),
                    )}
                  </span>
                ))}
                <div className="mt-1 border-t border-black pt-1 text-[7pt]">
                  Μέθοδος μέτρησης: {doc.earthMethod}
                </div>
              </Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} table-fixed`}>
          <CircuitHead />
          <tbody>
            <tr>
              <Td colSpan={14} className="text-[8pt]">
                Συμπληρώνεται σε επόμενη/ες σελίδα/ες του παρόντος πρωτοκόλλου ελέγχου.
              </Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} text-[8pt]`}>
          <tbody>
            <tr>
              <Td className="h-[11mm]">
                Παρατηρήσεις:{" "}
                {doc.remarks ||
                  "................................................................................................................................................."}
              </Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} text-center text-[6.5pt]`}>
          <tbody>
            <tr>
              <Td rowSpan={2} className="w-[16%] align-middle text-left">
                Χρησιμοποιηθέντα όργανα μετρήσεων
              </Td>
              <Td>Όργανο</Td>
              <Td>Τύπος</Td>
              <Td>Σειριακός αριθμός</Td>
              <Td>Όργανο</Td>
              <Td>Τύπος</Td>
              <Td>Σειριακός αριθμός</Td>
            </tr>
            <tr>
              <Td>{i.instrumentName}</Td>
              <Td>{i.instrumentType}</Td>
              <Td>{i.instrumentSerial}</Td>
              <Td>…………</Td>
              <Td>…………</Td>
              <Td>…………</Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} text-[7pt]`}>
          <tbody>
            <tr>
              <Td className="h-[12mm]">
                <b>Συστάσεις και υποδείξεις για αναβάθμιση του επιπέδου ασφάλειας της ΕΗΕ</b>{" "}
                <i>(δεν αφορά σε μη συμμορφώσεις)</i>: {doc.recommendations}
              </Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} text-[6pt]`}>
          <tbody>
            <tr>
              <Td className="w-[34%]">
                <b>Π Ρ Ο Σ Ο Χ Η :</b>
                <br />
                Τυχόν μη συμμορφώσεις που αφορούν στα ως άνω πεδία 1, 2 και 3 και διαπιστώθηκαν κατά
                τον έλεγχο, αναφέρονται στα σχετικά πεδία παρατηρήσεων και αποκαθίστανται πριν την
                υποβολή του παρόντος.
              </Td>
              <Td className="w-[33%]">
                Επικόλληση ετικέτας ελέγχου στον κεντρικό πίνακα διανομής με αναγραφή της
                ημερομηνίας ελέγχου και της ημερομηνίας του επόμενου τακτικού επανελέγχου{" "}
                {box(doc.labelAffixed, "Επικόλληση ετικέτας ελέγχου", () =>
                  onLabelAffixedChange(!doc.labelAffixed),
                )}
              </Td>
              <Td className="bg-[#d9d9d9] text-center">
                <b>Διενέργεια επόμενου τακτικού επανελέγχου έως:</b>
                <div className="mt-1 text-[7pt] font-semibold">
                  {INSTALLATION_USE_CATEGORIES[recheckCategory].label} — κάθε {recheckInterval} έτη
                </div>
                <div className="mx-auto mt-1 w-4/5 border border-black bg-white py-1 text-[8pt] font-bold">
                  {doc.nextCheck || "…… / …… / ……"}
                </div>
              </Td>
            </tr>
          </tbody>
        </table>

        <table className={`${tableClass} text-[7pt]`}>
          <tbody>
            <tr>
              <Td colSpan={2}>
                <b>
                  Από τον διενεργηθέντα έλεγχο προκύπτει ότι το πρωτόκολλο της περιγραφόμενης ΕΗΕ,
                  κατά τον χρόνο ελέγχου, {conclusionText} στις απαιτήσεις της κείμενης νομοθεσίας
                  {" — "}
                  ΑΣΦΑΛΗΣ{" "}
                  {box(safeChecked, "Συμπέρασμα: Ασφαλής", () =>
                    onConclusionChange(safeChecked ? "none" : "safe"),
                  )}{" "}
                  ΜΗ ΑΣΦΑΛΗΣ{" "}
                  {box(unsafeChecked, "Συμπέρασμα: Μη ασφαλής", () =>
                    onConclusionChange(unsafeChecked ? "none" : "unsafe"),
                  )}
                </b>
              </Td>
            </tr>
            <tr>
              <Td className="w-[50%] text-center">
                <InstallerStamp lines={doc.stampLines} image={i.stampImage} />
              </Td>
              <Td className="text-center">
                Ο παραλαμβάνων το πρωτόκολλο ελέγχου ιδιοκτήτης / καταναλωτής
                <br />
                <span className="text-[6pt]">(Όνομα, Επώνυμο, Υπογραφή)</span>
              </Td>
            </tr>
            <tr>
              <Td>
                Τόπος: {value(doc.place, 6)} &nbsp; Ημερ/νία ελέγχου: {value(doc.date, 4)}
              </Td>
              <Td>Τόπος: …………………………………… &nbsp; Ημερ/νία: ……………………</Td>
            </tr>
          </tbody>
        </table>
      </Page>

      <Page page={2}>
        <table className={`${tableClass} table-fixed`}>
          <CircuitHead />
          <tbody className="text-center text-[7pt]">
            <tr className="font-bold">
              <Td />
              <Td className="text-left font-normal">ΠΙΝΑΚΑΣ</Td>
              <Td>{doc.feed.cableType}</Td>
              <Td>{doc.feed.conductors}</Td>
              <Td>{doc.feed.section}</Td>
              <Td />
              <Td>-</Td>
              <Td>{doc.feed.kind}</Td>
              <Td>{doc.feed.amps}</Td>
              <Td>{doc.feed.rcd}</Td>
              <Td>{doc.feed.rcdIdn}</Td>
              <Td />
              <Td />
              <Td />
            </tr>
            {doc.rows.map((row) => (
              <MeasurementRow key={row.id} row={row} />
            ))}
            {Array.from({ length: doc.blankRows }, (_, index) => (
              <tr key={`blank-${index}`} className="h-[4.5mm]">
                {Array.from({ length: 14 }, (_, cell) => (
                  <Td key={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 pl-[8mm] text-left">
          <InstallerStamp lines={doc.stampLines} image={i.stampImage} />
        </div>
      </Page>
    </div>
  );
}
