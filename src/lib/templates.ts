// Predefined panel templates that can be loaded with one click.
import type { PanelConfig } from "./panel";
import { defaultConfig } from "./panel";

export interface Template {
  id: string;
  name: string;
  description: string;
  build: () => PanelConfig;
}

function base(over: Partial<PanelConfig>): PanelConfig {
  return { ...defaultConfig(), date: "", ...over };
}

export const TEMPLATES: Template[] = [
  {
    id: "apt-mono",
    name: "Διαμέρισμα Μονοφασικό (Βασικό)",
    description: "1Φ 40A, 6 γραμμές, με ρελέ 30mA — τυπικό διαμέρισμα",
    build: () =>
      base({
        supply: "mono",
        mainSwitch: 40,
        mainFuse: 40,
        protectionType: "fuse",
        rcdEnabled: true,
        rcdPoles: "2P",
        rcdAmps: 40,
        rcdType: "A",
        project: "Διαμέρισμα Μονοφασικό",
        panelName: "Γενικός Πίνακας Διαμερίσματος",
        circuits: [
          { id: "t1", poles: "1P", amps: 10, curve: "B", description: "Φωτισμός", cable: "3x1.5", phase: "L" },
          { id: "t2", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες", cable: "3x2.5", phase: "L" },
          { id: "t3", poles: "1P+N", amps: 25, curve: "C", description: "Κουζίνα", cable: "3x4", phase: "L" },
          { id: "t4", poles: "1P", amps: 20, curve: "C", description: "Θερμοσίφωνας", cable: "3x2.5", phase: "L" },
          { id: "t5", poles: "1P", amps: 16, curve: "C", description: "Κλιματιστικό", cable: "3x2.5", phase: "L" },
          { id: "t6", poles: "1P", amps: 16, curve: "C", description: "Πλυντήριο ρούχων", cable: "3x2.5", phase: "L" },
        ],
      }),
  },
  {
    id: "house-tri",
    name: "Κατοικία Τριφασική (Πλήρης)",
    description: "3Φ 63A, 12 γραμμές, 4P ρελέ — πλήρης κατοικία",
    build: () =>
      base({
        supply: "tri",
        mainSwitch: 63,
        mainFuse: 50,
        protectionType: "mcb",
        rcdEnabled: true,
        rcdPoles: "4P",
        rcdAmps: 63,
        rcdType: "A",
        project: "Κατοικία Τριφασική",
        panelName: "Γενικός Πίνακας Κατοικίας 3Φ",
        circuits: [
          { id: "t1", poles: "1P", amps: 10, curve: "B", description: "Φωτισμός", cable: "3x1.5", phase: "L1" },
          { id: "t2", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L1", cable: "3x2.5", phase: "L1" },
          { id: "t3", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L2", cable: "3x2.5", phase: "L2" },
          { id: "t4", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L3", cable: "3x2.5", phase: "L3" },
          { id: "t5", poles: "1P+N", amps: 25, curve: "C", description: "Κουζίνα", cable: "3x4", phase: "L1" },
          { id: "t6", poles: "1P", amps: 20, curve: "C", description: "Θερμοσίφωνας", cable: "3x2.5", phase: "L2" },
          { id: "t7", poles: "1P", amps: 16, curve: "C", description: "Κλιματιστικό 1", cable: "3x2.5", phase: "L3" },
          { id: "t8", poles: "1P", amps: 16, curve: "C", description: "Κλιματιστικό 2", cable: "3x2.5", phase: "L1" },
          { id: "t9", poles: "1P", amps: 16, curve: "C", description: "Πλυντήριο ρούχων", cable: "3x2.5", phase: "L2" },
          { id: "t10", poles: "1P", amps: 16, curve: "C", description: "Πλυντήριο πιάτων", cable: "3x2.5", phase: "L3" },
          { id: "t11", poles: "3P", amps: 16, curve: "C", description: "Αντλία θερμότητας", cable: "5x2.5", phase: "L123" },
          { id: "t12", poles: "1P", amps: 10, curve: "B", description: "Εξωτερικός φωτισμός", cable: "3x1.5", phase: "L1" },
        ],
      }),
  },
  {
    id: "site-mono",
    name: "Εργοταξιακός Πίνακας 1Φ",
    description: "1Φ 40A, 4 γραμμές — εργοτάξιο",
    build: () =>
      base({
        supply: "mono",
        mainSwitch: 40,
        mainFuse: 32,
        protectionType: "mcb",
        rcdEnabled: true,
        rcdPoles: "2P",
        rcdAmps: 40,
        rcdType: "A",
        indicatorLamp: true,
        project: "Εργοταξιακός Πίνακας 1Φ",
        panelName: "Πίνακας Εργοταξίου 1Φ",
        circuits: [
          { id: "t1", poles: "1P", amps: 16, curve: "C", description: "Φωτισμός εργοταξίου", cable: "3x2.5", phase: "L" },
          { id: "t2", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες", cable: "3x2.5", phase: "L" },
          { id: "t3", poles: "1P", amps: 16, curve: "C", description: "Μηχανήματα", cable: "3x2.5", phase: "L" },
          { id: "t4", poles: "1P", amps: 10, curve: "B", description: "Θυροτηλέφωνο", cable: "3x1.5", phase: "L" },
        ],
      }),
  },
  {
    id: "site-tri",
    name: "Εργοταξιακός Πίνακας 3Φ",
    description: "3Φ 63A, 6 γραμμές με 3Φ μηχανήματα",
    build: () =>
      base({
        supply: "tri",
        mainSwitch: 63,
        mainFuse: 50,
        protectionType: "mccb",
        rcdEnabled: true,
        rcdPoles: "4P",
        rcdAmps: 63,
        rcdType: "A",
        indicatorLamp: true,
        project: "Εργοταξιακός Πίνακας 3Φ",
        panelName: "Πίνακας Εργοταξίου 3Φ",
        circuits: [
          { id: "t1", poles: "1P", amps: 16, curve: "C", description: "Φωτισμός", cable: "3x2.5", phase: "L1" },
          { id: "t2", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες", cable: "3x2.5", phase: "L2" },
          { id: "t3", poles: "1P", amps: 16, curve: "C", description: "Υδραυλικά", cable: "3x2.5", phase: "L3" },
          { id: "t4", poles: "3P", amps: 20, curve: "C", description: "Σκαφός / Ανελκυστήρας", cable: "5x4", phase: "L123" },
          { id: "t5", poles: "3P", amps: 16, curve: "C", description: "Μηχανήματα", cable: "5x2.5", phase: "L123" },
          { id: "t6", poles: "1P", amps: 10, curve: "B", description: "Θυροτηλέφωνο", cable: "3x1.5", phase: "L1" },
        ],
      }),
  },
  {
    id: "shop",
    name: "Επαγγελματικός Χώρος / Κατάστημα",
    description: "3Φ 63A, 10 γραμμές — κατάστημα / γραφείο",
    build: () =>
      base({
        supply: "tri",
        mainSwitch: 63,
        mainFuse: 50,
        protectionType: "mcb",
        rcdEnabled: true,
        rcdPoles: "4P",
        rcdAmps: 63,
        rcdType: "A",
        indicatorLamp: true,
        project: "Επαγγελματικός Χώρος",
        panelName: "Πίνακας Καταστήματος",
        circuits: [
          { id: "t1", poles: "1P", amps: 10, curve: "B", description: "Φωτισμός", cable: "3x1.5", phase: "L1" },
          { id: "t2", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L1", cable: "3x2.5", phase: "L1" },
          { id: "t3", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L2", cable: "3x2.5", phase: "L2" },
          { id: "t4", poles: "1P", amps: 16, curve: "C", description: "Ρευματοδότες L3", cable: "3x2.5", phase: "L3" },
          { id: "t5", poles: "1P+N", amps: 25, curve: "C", description: "Κουζίνα / Νεροχύτης", cable: "3x4", phase: "L1" },
          { id: "t6", poles: "1P", amps: 16, curve: "C", description: "Ψυγείο", cable: "3x2.5", phase: "L2" },
          { id: "t7", poles: "1P", amps: 16, curve: "C", description: "Κλιματιστικό 1", cable: "3x2.5", phase: "L3" },
          { id: "t8", poles: "1P", amps: 16, curve: "C", description: "Κλιματιστικό 2", cable: "3x2.5", phase: "L1" },
          { id: "t9", poles: "3P", amps: 16, curve: "C", description: "Κλιματιστικό κεντρικό", cable: "5x2.5", phase: "L123" },
          { id: "t10", poles: "1P", amps: 10, curve: "B", description: "Σήμανση / Πινακίδα", cable: "3x1.5", phase: "L2" },
        ],
      }),
  },
];
