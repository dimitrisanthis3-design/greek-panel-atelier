// Printable "Πρωτόκολλο Ελέγχου Ηλεκτρικής Εγκατάστασης" (ΕΛΟΤ 60364 / HD 384).
// The very same markup is used on screen (plain white A4 paper with a drop shadow) and for
// printing / PDF export: black text, thin black 1px rules, no UI chrome.
import type { ReactNode } from "react";
import type { DocCheck, ProtocolDoc } from "@/lib/protocol";
import { NETWORK_LABELS, NETWORK_TYPES, RECHECK_YEARS } from "@/lib/yde";

export const BOX_ON = "☑";
export const BOX_OFF = "☐";

const box = (on: boolean) => (on ? BOX_ON : BOX_OFF);
/** Blank field placeholder, left to be filled in by hand on the printed sheet. */
const fill = (v: string, dots = 8) => (v.trim() ? v : "…".repeat(dots));

const cellCls = "border border-black px-1 py-[2px] align-top";
const pageCls =
  "yde-page mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[10mm] py-[10mm] " +
  "font-[Arial,Helvetica,sans-serif] text-[9pt] leading-tight text-black shadow-sheet " +
  "print:min-h-0 print:w-auto print:px-0 print:py-0 print:shadow-none";

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
    <td colSpan={colSpan} rowSpan={rowSpan} className={`${cellCls} ${className}`}>
      {children}
    </td>
  );
}

function Th({
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
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`${cellCls} text-center font-bold ${className}`}
    >
      {children}
    </th>
  );
}

function SectionRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`${cellCls} font-bold`}>
        {children}
      </td>
    </tr>
  );
}

/** One row of the visual / functional check table (columns: ΝΑΙ – ΟΧΙ – Δ/Ε). */
function CheckRow({ c }: { c: DocCheck }) {
  const tick = "w-[8%] text-center text-[11pt] leading-none";
  return (
    <tr>
      <Td className="w-[7%] text-center">{c.id}</Td>
      <Td>{c.label}</Td>
      <Td className={tick}>{box(c.result === "ok")}</Td>
      <Td className={tick}>{box(c.result === "fail")}</Td>
      <Td className={tick}>{box(c.result === "na")}</Td>
    </tr>
  );
}

/** Blue rectangular installer stamp, printed next to the signature. */
export function Stamp({ lines, image = "" }: { lines: string[]; image?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt="Ψηφιακή σφραγίδα και υπογραφή εγκαταστάτη"
        className="h-[26mm] w-[70mm] object-contain"
      />
    );
  }
  if (!lines.length)
    return <div className="h-[26mm] w-[70mm] border border-dashed border-black/40" />;
  return (
    <div className="inline-block border-2 border-[#1f3b8a] px-3 py-1 text-center font-bold leading-tight text-[#1f3b8a]">
      {lines.map((l, i) => (
        <div key={l} className={i === 0 ? "text-[11pt] tracking-[0.3em]" : "text-[7.5pt]"}>
          {l}
        </div>
      ))}
    </div>
  );
}

function Page({ children, no, total }: { children: ReactNode; no: number; total: number }) {
  return (
    <section className={pageCls}>
      <div className="flex-1 space-y-[2mm]">{children}</div>
      <p className="mt-[3mm] border-t border-black pt-[1mm] text-center text-[7.5pt]">
        Πρωτόκολλο Ελέγχου Εσωτερικής Ηλεκτρικής Εγκατάστασης κατά ΕΛΟΤ 60364 / HD 384 — Σελίδα {no}{" "}
        από {total}
      </p>
    </section>
  );
}

export function LegacyProtocolDocument({ doc }: { doc: ProtocolDoc }) {
  const i = doc.installer;
  const t = "yde-table w-full border-collapse border border-black";
  const networkBoxes = NETWORK_TYPES.map(
    (n) => `${NETWORK_LABELS[n]} ${box(doc.network === n)}`,
  ).join("   ");

  return (
    <div className="space-y-6 print:space-y-0">
      {/* ---------- Σελίδα 1 ---------- */}
      <Page no={1} total={2}>
        {/* Κεφαλίδα */}
        <table className={t}>
          <tbody>
            <tr>
              <Td colSpan={2} className="text-center">
                <p className="text-[11.5pt] font-bold">
                  ΠΡΩΤΟΚΟΛΛΟ ΕΛΕΓΧΟΥ ΗΛΕΚΤΡΙΚΗΣ ΕΓΚΑΤΑΣΤΑΣΗΣ
                </p>
                <p className="text-[9pt]">(κατά ΕΛΟΤ 60364 / HD 384)</p>
              </Td>
            </tr>
            <tr>
              <Td className="w-[50%]">Αρ. Πρωτοκόλλου: {fill(doc.protocolNo, 10)}</Td>
              <Td>Ημερομηνία ελέγχου: {fill(doc.date, 5)}</Td>
            </tr>
            <tr>
              <Td colSpan={2}>
                <b>Τύπος ελέγχου:</b> &nbsp; Αρχικός {box(doc.checkKind === "initial")} &nbsp;&nbsp;
                Τακτικός επανέλεγχος {box(doc.checkKind === "periodic")} &nbsp;&nbsp; Έκτακτος{" "}
                {box(doc.checkKind === "extraordinary")}
                {doc.checkKind === "extraordinary" ? (
                  <span> &nbsp;– Αιτία: {fill(doc.extraReason, 6)}</span>
                ) : null}
              </Td>
            </tr>
          </tbody>
        </table>

        {/* Πλαίσιο 1 – στοιχεία εγκατάστασης & ιδιοκτήτη/χρήστη */}
        <table className={t}>
          <tbody>
            <SectionRow colSpan={4}>ΣΤΟΙΧΕΙΑ ΕΓΚΑΤΑΣΤΑΣΗΣ &amp; ΙΔΙΟΚΤΗΤΗ / ΧΡΗΣΤΗ</SectionRow>
            <tr>
              <Td className="w-[22%]">Ιδιότητα / Ονοματεπώνυμο</Td>
              <Td colSpan={3}>
                Ιδιοκτήτης {box(doc.ownerRole === "owner")} &nbsp;&nbsp; Καταναλωτής{" "}
                {box(doc.ownerRole === "consumer")} &nbsp;&nbsp; – &nbsp;
                {fill(doc.owner, 14)}
              </Td>
            </tr>
            <tr>
              <Td>Διεύθυνση εγκατάστασης</Td>
              <Td colSpan={3}>
                {fill(doc.address, 12)} {doc.cityLine}
              </Td>
            </tr>
            <tr>
              <Td>Αρ. Παροχής ΔΕΔΔΗΕ</Td>
              <Td className="w-[28%]">{fill(doc.supplyNo, 6)}</Td>
              <Td className="w-[22%]">Ονομαστική τάση</Td>
              <Td>{doc.voltage} V</Td>
            </tr>
            <tr>
              <Td>Χρήση χώρου / Κατηγορία</Td>
              <Td>{fill(doc.installCategory, 6)}</Td>
              <Td>Κωδ. εγκατάστασης</Td>
              <Td>{fill(doc.installCode, 4)}</Td>
            </tr>
            <tr>
              <Td>Σύστημα γείωσης</Td>
              <Td colSpan={3}>{networkBoxes}</Td>
            </tr>
            <tr>
              <Td>Παροχή</Td>
              <Td colSpan={3}>
                Μονοφασική 1Φ {box(doc.supply === "mono")} &nbsp;&nbsp; Τριφασική 3Φ{" "}
                {box(doc.supply === "tri")}
              </Td>
            </tr>
          </tbody>
        </table>

        {/* Πλαίσιο 2 – στοιχεία εγκαταστάτη ηλεκτρολόγου */}
        <table className={t}>
          <tbody>
            <SectionRow colSpan={4}>ΣΤΟΙΧΕΙΑ ΕΓΚΑΤΑΣΤΑΤΗ ΗΛΕΚΤΡΟΛΟΓΟΥ</SectionRow>
            <tr>
              <Td className="w-[22%]">Ονοματεπώνυμο</Td>
              <Td className="w-[28%]">{fill(i.name, 6)}</Td>
              <Td className="w-[22%]">Ειδικότητα</Td>
              <Td>{fill(i.specialty, 6)}</Td>
            </tr>
            <tr>
              <Td>Αρ. Άδειας</Td>
              <Td>{fill(i.licenseNo, 5)}</Td>
              <Td>Αρ. Αναγγελίας / Α.Μ. Ε.Ε.Τ.Ε.Μ.</Td>
              <Td>{fill([i.announcementNo, i.amNo].filter(Boolean).join(" / "), 6)}</Td>
            </tr>
            <tr>
              <Td>ΑΦΜ</Td>
              <Td>{fill(i.afm, 5)}</Td>
              <Td>ΔΟΥ</Td>
              <Td>{fill(i.doy, 5)}</Td>
            </tr>
            <tr>
              <Td>Διεύθυνση</Td>
              <Td>{fill(i.address, 6)}</Td>
              <Td>Τηλέφωνο</Td>
              <Td>{fill(i.phone, 5)}</Td>
            </tr>
          </tbody>
        </table>

        {/* Πλαίσιο 3 – οπτικός έλεγχος & δοκιμές */}
        <table className={t}>
          <tbody>
            <SectionRow colSpan={5}>ΠΙΝΑΚΑΣ ΟΠΤΙΚΟΥ ΕΛΕΓΧΟΥ &amp; ΔΟΚΙΜΩΝ</SectionRow>
            <tr>
              <Th className="w-[7%]">Α/Α</Th>
              <Th>Περιγραφή Ελέγχου</Th>
              <Th className="w-[8%]">ΝΑΙ</Th>
              <Th className="w-[8%]">ΟΧΙ</Th>
              <Th className="w-[8%]">Δ/Ε</Th>
            </tr>
            {doc.visualChecks.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
            {doc.testChecks.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
            {doc.measureChecks.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
            <tr>
              <Td colSpan={5}>Παρατηρήσεις: {doc.remarksVisual}</Td>
            </tr>
          </tbody>
        </table>

        {/* Πλαίσιο 5 – μετρήσεις γείωσης & γενικών δοκιμών */}
        <table className={t}>
          <tbody>
            <SectionRow colSpan={4}>ΜΕΤΡΗΣΕΙΣ ΓΕΙΩΣΗΣ &amp; ΓΕΝΙΚΩΝ ΔΟΚΙΜΩΝ</SectionRow>
            <tr>
              <Td className="w-[26%]">
                Αντίσταση γείωσης R<sub>a</sub>
              </Td>
              <Td className="w-[24%]">{doc.earthOhms ? `${doc.earthOhms} Ω` : "……… Ω"}</Td>
              <Td className="w-[26%]">Είδος γείωσης</Td>
              <Td>
                {doc.earthTypes
                  .map((e) => `${e.label} ${box(doc.earthType === e.key)}`)
                  .join("   ")}
              </Td>
            </tr>
            <tr>
              <Td>Μέθοδος μέτρησης</Td>
              <Td colSpan={3}>{fill(doc.earthMethod, 8)}</Td>
            </tr>
            <tr>
              <Td>Όργανο μέτρησης (μάρκα)</Td>
              <Td>{fill(i.instrumentName, 6)}</Td>
              <Td>Τύπος / Σειριακός αριθμός</Td>
              <Td>{fill([i.instrumentType, i.instrumentSerial].filter(Boolean).join(" / "), 6)}</Td>
            </tr>
            <tr>
              <Td>Ημ. διακρίβωσης οργάνου</Td>
              <Td colSpan={3}>{fill("", 8)}</Td>
            </tr>
            <tr>
              <Td colSpan={4}>Παρατηρήσεις μετρήσεων: {doc.remarksMeasure}</Td>
            </tr>
          </tbody>
        </table>
      </Page>

      {/* ---------- Σελίδα 2 ---------- */}
      <Page no={2} total={2}>
        {/* Πλαίσιο 4 – δοκιμές & μετρήσεις κυκλωμάτων */}
        <table className={`${t} table-fixed`}>
          <thead>
            <tr>
              <Th className="w-[7%]">Α/Α Γραμμής</Th>
              <Th className="w-[26%]">Περιγραφή Κυκλώματος</Th>
              <Th className="w-[12%]">Ασφάλεια (A / Καμπύλη)</Th>
              <Th className="w-[16%]">Καλώδιο (Τύπος / Διατομή)</Th>
              <Th className="w-[10%]">
                R<sub>iso</sub> (MΩ)
              </Th>
              <Th className="w-[10%]">Συνέχεια ΡΕ (Ω)</Th>
              <Th className="w-[11%]">Διακοπή RCD (ms / mA)</Th>
              <Th className="w-[8%]">
                Z<sub>s</sub> (Ω)
              </Th>
            </tr>
          </thead>
          <tbody className="text-center">
            <tr className="h-[5mm] font-bold">
              <Td>—</Td>
              <Td className="text-left">Γραμμή παροχής</Td>
              <Td>
                {doc.feed.kind} {doc.feed.amps}
              </Td>
              <Td>
                {doc.feed.cableType} {doc.feed.conductors}×{doc.feed.section}
              </Td>
              <Td />
              <Td />
              <Td>
                {doc.feed.rcd} / {doc.feed.rcdIdn} mA
              </Td>
              <Td />
            </tr>
            {doc.rows.map((r) => (
              <tr key={r.id} className="h-[5mm]">
                <Td>{r.no}</Td>
                <Td className="text-left">{r.use}</Td>
                <Td>
                  {r.kind} {r.amps}
                </Td>
                <Td>
                  {r.cableType} {r.conductors}×{r.section}
                </Td>
                <Td>{r.riso}</Td>
                <Td />
                <Td>{r.imess}</Td>
                <Td>{r.zs}</Td>
              </tr>
            ))}
            {Array.from({ length: doc.blankRows }, (_, k) => (
              <tr key={`b${k}`} className="h-[5mm]">
                {Array.from({ length: 8 }, (_, j) => (
                  <Td key={j} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Πλαίσιο 6 – συμπέρασμα ελέγχου */}
        <table className={t}>
          <tbody>
            <SectionRow colSpan={2}>ΣΥΜΠΕΡΑΣΜΑ ΕΛΕΓΧΟΥ</SectionRow>
            <tr>
              <Td colSpan={2} className="text-[10pt]">
                Από τον διενεργηθέντα έλεγχο προκύπτει ότι η εγκατάσταση κρίνεται: &nbsp;&nbsp;
                <b>ΑΣΦΑΛΗΣ {box(doc.passes)}</b> &nbsp;&nbsp;&nbsp;{" "}
                <b>ΜΗ ΑΣΦΑΛΗΣ {box(!doc.passes)}</b>
              </Td>
            </tr>
            <tr>
              <Td className="w-[50%]">Προτεινόμενος χρόνος επανελέγχου: {RECHECK_YEARS} έτη</Td>
              <Td>Ημερ/νία επόμενου τακτικού επανελέγχου: {fill(doc.nextCheck, 5)}</Td>
            </tr>
            <tr>
              <Td colSpan={2} className="h-[12mm]">
                Παρατηρήσεις: {doc.remarks}
              </Td>
            </tr>
            <tr>
              <Td colSpan={2} className="h-[10mm]">
                Συστάσεις και υποδείξεις για αναβάθμιση του επιπέδου ασφάλειας της ΕΗΕ{" "}
                <i>(δεν αφορά σε μη συμμορφώσεις)</i>: {doc.recommendations}
              </Td>
            </tr>
            <tr>
              <Td className="w-[42%]">
                Επικόλληση ετικέτας ελέγχου στον κεντρικό πίνακα διανομής {box(doc.labelAffixed)}
              </Td>
              <Td className="text-center">
                <p className="font-bold">Ο Ελέγξας Ηλεκτρολόγος Εγκαταστάτης</p>
                <p className="text-[7.5pt]">(Ημερομηνία – Σφραγίδα – Υπογραφή)</p>
                <p className="mt-1 text-[8pt]">
                  Τόπος: {fill(doc.place, 5)} &nbsp; Ημερομηνία: {fill(doc.date, 5)}
                </p>
                <div className="mt-1 flex justify-center">
                  <Stamp lines={doc.stampLines} image={i.stampImage} />
                </div>
              </Td>
            </tr>
          </tbody>
        </table>
      </Page>
    </div>
  );
}

export { ProtocolDocumentTemplate as ProtocolDocument } from "./ProtocolDocumentTemplate";
export type { ProtocolDocumentHandlers } from "./ProtocolDocumentTemplate";
