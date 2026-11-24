// Printable two-page "Πρωτόκολλο Ελέγχου" sheet laid out like the electrician's Word form.
// Plain black-on-white document styling: it is printed / saved as PDF.
import type { ReactNode } from "react";
import type { DocCheck, ProtocolDoc } from "@/lib/protocol";
import type { CheckResult } from "@/lib/yde";

export const BOX_ON = "☑";
export const BOX_OFF = "☐";
export const resultMark = (r: CheckResult) => (r === "ok" ? BOX_ON : r === "fail" ? "☒" : "—");
const box = (on: boolean) => (on ? BOX_ON : BOX_OFF);
const dots = (v: string, n = 40) => v || "…".repeat(Math.ceil(n / 3));

function C({
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
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-black px-1 py-0.5 align-top ${className}`}
    >
      {children}
    </td>
  );
}

function CheckCells({ c }: { c: DocCheck | null }) {
  if (!c)
    return (
      <>
        <C />
        <C />
      </>
    );
  return (
    <>
      <C className="w-[24%]">
        {c.id}. {c.label}
      </C>
      <C className="w-[9%] text-center text-[11pt] leading-none">{resultMark(c.result)}</C>
    </>
  );
}

export function Stamp({ lines }: { lines: string[] }) {
  if (!lines.length)
    return <div className="h-[30mm] w-[72mm] border border-dashed border-black/40" />;
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

export function CircuitHead() {
  const v = "[writing-mode:vertical-rl] rotate-180 mx-auto";
  return (
    <thead className="text-center text-[6.5pt] leading-tight">
      <tr>
        <C rowSpan={2} className="w-[4%] align-middle">
          <span className={v}>Αρ. Ηλεκτρικού Κυκλώματος</span>
        </C>
        <C rowSpan={2} className="w-[27%] align-middle text-[7.5pt]">
          Χώρος /Τμήμα εγκατάστασης, Χρήση
        </C>
        <C colSpan={3} className="align-middle text-[7.5pt]">
          Γραμμή τροφοδοσίας/ καλώδιο
        </C>
        <C colSpan={2}>3.2 Αντίσταση μόνωσης Riso(MΩ) (άρθρα 612.3 &amp; 612.4)</C>
        <C colSpan={2} className="align-middle text-[7pt]">
          Διάταξη προστασίας από υπερένταση
        </C>
        <C colSpan={4}>3.3 Διάταξη διαφορικού ρεύματος (RCD) (παράρτημα Π.61-Β)</C>
        <C>3.4 Βρόχος σφάλμ. (παράγραφος 612.6.3 &amp; παράρτημα Π.61-Δ)</C>
      </tr>
      <tr>
        <C className="w-[6%] align-middle">Τύπος καλωδίου</C>
        <C className="w-[4%]">
          <span className={v}>Αριθ. Αγωγών</span>
        </C>
        <C className="w-[4.5%]">
          <span className={v}>Διατομή αγωγού mm²</span>
        </C>
        <C className="w-[4.5%]">
          <span className={v}>Με καταναλώσεις</span>
        </C>
        <C className="w-[4.5%]">
          <span className={v}>Χωρίς καταναλώσεις</span>
        </C>
        <C className="w-[9%] align-middle">Είδος/ Χαρακτηριστική</C>
        <C className="w-[3.5%] align-middle">
          I<sub>n</sub> (A)
        </C>
        <C className="w-[7%] align-middle">
          Ονομαστικό ρεύμα I<sub>n</sub> (A) &amp; τύπος
        </C>
        <C className="w-[4.5%] align-middle">
          I<sub>ΔN</sub> (mA)
        </C>
        <C className="w-[4.5%] align-middle">
          I<sub>mess</sub> (mA)
        </C>
        <C className="w-[4.5%] align-middle">
          U<sub>mess</sub> (V)
        </C>
        <C className="w-[8.5%] align-middle">
          Z<sub>s</sub> (Ω) ή I<sub>k</sub> (A)
        </C>
      </tr>
    </thead>
  );
}

function Page({ children, no }: { children: ReactNode; no: number }) {
  return (
    <div className="yde-page mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[9mm] py-[8mm] font-[Arial,Helvetica,sans-serif] text-[8pt] leading-snug text-black shadow-sheet print:min-h-0 print:p-0 print:shadow-none">
      {no === 1 ? (
        <p className="mb-1.5 text-[10.5pt] font-bold">
          Πρωτόκολλο Ελέγχου Εσωτερικής Ηλεκτρικής Εγκατάστασης κατά ΕΛΟΤ HD 384{" "}
          <span className="text-[9pt] font-normal">Σελίδα 1 από 2</span>
        </p>
      ) : (
        <p className="mb-1.5 text-right text-[9pt]">Σελίδα 2 από 2</p>
      )}
      {children}
    </div>
  );
}

export function ProtocolDocument({ doc }: { doc: ProtocolDoc }) {
  const i = doc.installer;
  const t = "w-full border-collapse border-2 border-black";
  return (
    <div className="space-y-6 print:space-y-0">
      <Page no={1}>
        <table className={t}>
          <tbody>
            <tr>
              <C className="w-[33%]">
                <p className="text-[10pt] font-bold">
                  Πρωτόκολλο ελέγχου Nο {dots(doc.protocolNo, 12)}
                </p>
                <p className="italic">με βάση την κείμενη νομοθεσία</p>
              </C>
              <C className="w-[37%] text-center">
                <p className="text-[9pt] font-bold">
                  Ιδιοκτήτης {box(doc.ownerRole === "owner")} &nbsp;&nbsp; Καταναλωτής{" "}
                  {box(doc.ownerRole === "consumer")}
                </p>
                <p className="mt-1 text-[9pt]">{doc.owner}</p>
              </C>
              <C>
                <p>
                  <b>Αρ. παροχής:</b> {doc.supplyNo}
                </p>
                <p>
                  <b>Διεύθυνση:</b> {doc.address}
                </p>
                <p className="pl-10">{doc.cityLine}</p>
              </C>
            </tr>
            <tr>
              <C rowSpan={2}>
                <p className="font-bold">Αρχικός έλεγχος (*) {box(doc.checkKind === "initial")}</p>
                <p className="font-bold">
                  Τακτικός επανέλεγχος {box(doc.checkKind === "periodic")}
                </p>
                <p className="font-bold">
                  Έκτακτος έλεγχος {box(doc.checkKind === "extraordinary")}
                </p>
                <p className="font-bold italic">Αιτία έκτακτου ελέγχου:</p>
                <p>{doc.extraReason || "(προσδιορίστε)……………………………"}</p>
                <p className="mt-1 text-[6.5pt]">
                  (*) Με τους περιορισμούς της παραγράφου 5 του άρθρου 6
                </p>
              </C>
              <C className="text-center">
                <p className="text-[9pt] font-bold">Ηλεκτρολόγος εγκαταστάτης</p>
                <p className="mt-2 text-[11pt]">{i.name}</p>
              </C>
              <C>
                <p>Αριθμός Αδείας {i.licenseNo}</p>
                <p>Βεβ. Αναγγελίας {i.announcementNo}</p>
                <p>
                  <b>Κατηγορία:</b> {i.category}
                </p>
                <p>
                  <b>Ειδικότητα:</b> {i.specialty}
                </p>
              </C>
            </tr>
            <tr>
              <C colSpan={2} className="text-[9pt] font-bold">
                Κατηγορία εγκατάστασης: {doc.installCategory} &nbsp;Κωδ. {doc.installCode}
              </C>
            </tr>
            <tr>
              <C className="text-[9pt]">Ονομαστική τάση: &nbsp;&nbsp;{doc.voltage} (V)</C>
              <C colSpan={2} className="text-[9pt]">
                Δίκτυο τροφοδοσίας: &nbsp;&nbsp; TT-Σύστημα {box(doc.network === "TT")} &nbsp;&nbsp;
                TN-Σύστημα {box(doc.network === "TN")} &nbsp;&nbsp; IT-Σύστημα{" "}
                {box(doc.network === "IT")}
              </C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1`}>
          <tbody>
            <tr className="font-bold">
              <C className="text-[9.5pt]">1. Οπτικός έλεγχος:</C>
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
              <C />
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
              <C />
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
            </tr>
            {doc.visualGrid.map((row, r) => (
              <tr key={`v${r}`}>
                {row.map((c, k) => (
                  <CheckCells key={c?.id ?? `e${k}`} c={c} />
                ))}
              </tr>
            ))}
            <tr>
              <C colSpan={6} className="text-[9pt]">
                Παρατηρήσεις:{" "}
                {doc.remarksVisual || "……………………………………………………………………………………"}
              </C>
            </tr>
            <tr className="font-bold">
              <C className="text-[9.5pt]">2. Δοκιμές:</C>
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
              <C />
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
              <C />
              <C className="text-center text-[6.5pt]">Συμμόρφωση</C>
            </tr>
            {doc.testGrid.map((row, r) => (
              <tr key={`t${r}`}>
                {row.map((c, k) => (
                  <CheckCells key={c?.id ?? `e${k}`} c={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <table className={`${t} mt-1`}>
          <tbody>
            <tr>
              <C className="w-[33%]">
                <p className="flex justify-between font-bold">
                  <span className="text-[9.5pt]">3. Μετρήσεις:</span>
                  <span className="text-[6.5pt]">Συμμόρφωση</span>
                </p>
                {doc.measureChecks.map((c) => (
                  <p key={c.id} className="flex justify-between">
                    <span>
                      {c.id} {c.label}
                    </span>
                    <span className="text-[11pt] leading-none">{resultMark(c.result)}</span>
                  </p>
                ))}
              </C>
              <C className="text-[9pt]">Παρατηρήσεις: {doc.remarksMeasure}</C>
            </tr>
            <tr>
              <C>
                <p>3.5. Αντίσταση ηλεκτροδίου γείωσης</p>
                <p className="text-[6.5pt]">(παράγραφος 612.6.2 &amp; παράρτημα Π.61-Γ)</p>
                <p className="text-right text-[11pt]">
                  {doc.earthOhms ? `${doc.earthOhms} Ω` : "……… Ω"}
                </p>
              </C>
              <C className="text-[9pt]">
                <p>
                  Είδος γείωσης: &nbsp;
                  {doc.earthTypes.map((e) => (
                    <span key={e.key} className="mr-4">
                      {e.label} {box(doc.earthType === e.key)}
                    </span>
                  ))}
                </p>
                <p className="mt-1 border-t border-black pt-0.5">
                  Μέθοδος μέτρησης: {doc.earthMethod}
                </p>
              </C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1 table-fixed`}>
          <CircuitHead />
          <tbody>
            <tr>
              <C colSpan={14} className="text-[9pt]">
                Συμπληρώνεται σε επόμενη/ες σελίδα/ες του παρόντος πρωτοκόλλου ελέγχου.
              </C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1`}>
          <tbody>
            <tr>
              <C className="h-[11mm] text-[9pt]">Παρατηρήσεις : {doc.remarks}</C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1 text-center`}>
          <tbody>
            <tr>
              <C rowSpan={2} className="w-[20%] align-middle">
                Χρησιμοποιηθέντα όργανα μετρήσεων
              </C>
              <C>Όργανο</C>
              <C>Τύπος</C>
              <C>Σειριακός αριθμός</C>
              <C>Όργανο</C>
              <C>Τύπος</C>
              <C>Σειριακός αριθμός</C>
            </tr>
            <tr>
              <C>{i.instrumentName}</C>
              <C>{i.instrumentType}</C>
              <C>{i.instrumentSerial}</C>
              <C>…………</C>
              <C>…………</C>
              <C>…………</C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1`}>
          <tbody>
            <tr>
              <C className="h-[12mm] text-[9pt]">
                Συστάσεις και υποδείξεις για αναβάθμιση του επιπέδου ασφάλειας της ΕΗΕ{" "}
                <i>( δεν αφορά σε μη συμμορφώσεις )</i>: {doc.recommendations}
              </C>
            </tr>
          </tbody>
        </table>

        <table className={`${t} mt-1`}>
          <tbody>
            <tr>
              <C className="w-[35%] text-[7pt]">
                <p className="font-bold">Π Ρ Ο Σ Ο Χ Η :</p>
                Τυχόν μη συμμορφώσεις που αφορούν στα ως άνω πεδία 1, 2 και 3 και διαπιστώθηκαν
                κατά τον έλεγχο, αναφέρονται στα σχετικά πεδία παρατηρήσεων και αποκαθίστανται
                πριν την υποβολή του παρόντος.
              </C>
              <C className="w-[33%] align-middle text-[7pt]">
                Επικόλληση ετικέτας ελέγχου στον κεντρικό πίνακα διανομής με αναγραφή της
                ημερομηνίας ελέγχου και της ημερομηνίας του επόμενου τακτικού επανελέγχου{" "}
                {box(doc.labelAffixed)}
              </C>
              <C className="bg-[#d9d9d9] text-center">
                <p className="text-[9pt] font-bold">Διενέργεια επόμενου τακτικού επανελέγχου έως:</p>
                <p className="mx-auto mt-1 w-4/5 border border-black bg-white py-0.5 text-[10pt] font-bold">
                  {doc.nextCheck || "…… / …… / ……"}
                </p>
              </C>
            </tr>
          </tbody>
        </table>

        <div className="mt-1 border-2 border-black px-1.5 py-1">
          <p className="text-[9pt] font-bold">
            Από τον διενεργηθέντα έλεγχο προκύπτει ότι η περιγραφόμενη ΕΗΕ, κατά τον χρόνο ελέγχου,
            ανταποκρίνεται στις απαιτήσεις της κείμενης νομοθεσίας
          </p>
          <div className="mt-1 grid grid-cols-2 gap-4 text-center text-[8.5pt]">
            <div>
              <p>Ο ηλεκτρολόγος εγκαταστάτης</p>
              <p className="text-[7pt]">(Σφραγίδα, Υπογραφή)</p>
              <div className="mt-1 flex justify-center">
                <Stamp lines={doc.stampLines} />
              </div>
            </div>
            <div>
              <p>Ο παραλαμβάνων το πρωτόκολλο ελέγχου ιδιοκτήτης / καταναλωτής</p>
              <p className="text-[7pt]">( Όνομα, Επώνυμο Υπογραφή )</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-[8pt]">
            <p>
              Τόπος {dots(doc.place, 30)} &nbsp; Ημερ/νία ελέγχου {dots(doc.date, 20)}
            </p>
            <p>Τόπος……………………………… &nbsp; Ημερ/νία…………………</p>
          </div>
        </div>
      </Page>

      <Page no={2}>
        <table className={`${t} table-fixed`}>
          <CircuitHead />
          <tbody className="text-center text-[7.5pt]">
            <tr className="bg-[#bfbfbf] font-bold">
              <C />
              <C className="text-left font-normal">Γραμμή παροχής</C>
              <C>{doc.feed.cableType}</C>
              <C>{doc.feed.conductors}</C>
              <C>{doc.feed.section}</C>
              <C />
              <C>-</C>
              <C>{doc.feed.kind}</C>
              <C>{doc.feed.amps}</C>
              <C>{doc.feed.rcd}</C>
              <C>{doc.feed.rcdIdn}</C>
              <C />
              <C />
              <C />
            </tr>
            {doc.rows.map((r) => (
              <tr key={r.id} className="h-[5.2mm]">
                <C>{r.no}</C>
                <C className="text-left">{r.use}</C>
                <C>{r.cableType}</C>
                <C>{r.conductors}</C>
                <C>{r.section}</C>
                <C>{r.risoLoad}</C>
                <C>{r.riso}</C>
                <C>{r.kind}</C>
                <C>{r.amps}</C>
                <C />
                <C />
                <C>{r.imess}</C>
                <C>{r.umess}</C>
                <C>{r.zs}</C>
              </tr>
            ))}
            {Array.from({ length: doc.blankRows }, (_, k) => (
              <tr key={`b${k}`} className="h-[5.2mm]">
                {Array.from({ length: 14 }, (_, j) => (
                  <C key={j} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <Stamp lines={doc.stampLines} />
        </div>
      </Page>
    </div>
  );
}
