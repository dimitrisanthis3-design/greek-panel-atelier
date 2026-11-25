import {
  FileDown,
  FileUp,
  FolderOpen,
  LayoutTemplate,
  MoreHorizontal,
  Save,
  Trash2,
  FilePlus2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadText, fileSlug } from "@/lib/csv";
import { defaultConfig, type PanelConfig } from "@/lib/panel";
import { TEMPLATES } from "@/lib/templates";
import {
  deleteProject,
  listProjects,
  parseProjectFile,
  projectFile,
  saveProject,
  startNumberedProject,
  type SavedProject,
} from "@/lib/storage";

interface Props {
  cfg: PanelConfig;
  prices: Record<string, number>;
  onLoad: (cfg: PanelConfig) => void;
  onImportPrices: (prices: Record<string, number>) => void;
}

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export function ProjectBar({ cfg, prices, onLoad, onImportPrices }: Props) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [name, setName] = useState("");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const exists = projects.some(
    (p) => p.name.trim().toLocaleLowerCase("el") === name.trim().toLocaleLowerCase("el"),
  );

  const doSave = () => {
    if (!name.trim()) return;
    const res = saveProject(name, cfg);
    if (!res) {
      toast.error(
        "Δεν ήταν δυνατή η αποθήκευση. Ο χώρος του προγράμματος περιήγησης μπορεί να είναι γεμάτος.",
      );
      return;
    }
    setProjects(res);
    setSaveOpen(false);
    toast.success(`Το έργο «${name.trim()}» αποθηκεύτηκε.`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={() => setTemplatesOpen(true)}
      >
        <LayoutTemplate />
        <span className="hidden sm:inline">Πρότυπα</span>
      </Button>
      <Button
        size="sm"
        className="bg-electric text-electric-foreground hover:bg-electric/85"
        onClick={() => {
          setProjects(listProjects());
          setName(cfg.project || cfg.panelName);
          setSaveOpen(true);
        }}
      >
        <Save />
        <span className="hidden sm:inline">Αποθήκευση Έργου</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={() => {
          setProjects(listProjects());
          setLoadOpen(true);
        }}
      >
        <FolderOpen />
        <span className="hidden sm:inline">Φόρτωση Έργου</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Περισσότερα"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onSelect={() => {
              downloadText(
                projectFile(cfg, prices),
                `${fileSlug(cfg.project || cfg.panelName)}.json`,
                "application/json",
              );
              toast.success("Το αρχείο ρυθμίσεων κατέβηκε.");
            }}
          >
            <FileDown />
            Εξαγωγή αρχείου ρυθμίσεων (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <FileUp />
            Εισαγωγή αρχείου ρυθμίσεων (JSON)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              if (
                window.confirm("Νέος κενός πίνακας; Ό,τι δεν έχετε αποθηκεύσει ως έργο θα χαθεί.")
              ) {
                onLoad(startNumberedProject(defaultConfig()));
                toast.success("Ξεκινήσατε νέο πίνακα.");
              }
            }}
          >
            <FilePlus2 />
            Νέος πίνακας
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        data-testid="import-json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const parsed = parseProjectFile(await file.text());
          if (!parsed) {
            toast.error("Το αρχείο δεν είναι έγκυρο αρχείο ρυθμίσεων πίνακα.");
            return;
          }
          onLoad(parsed.config);
          if (Object.keys(parsed.prices).length) onImportPrices(parsed.prices);
          toast.success(`Φορτώθηκε το «${parsed.config.project || parsed.config.panelName}».`);
        }}
      />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Αποθήκευση Έργου</DialogTitle>
            <DialogDescription>
              Αποθηκεύεται σε αυτή τη συσκευή. Για άλλη συσκευή χρησιμοποιήστε την εξαγωγή JSON.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doSave();
            }}
            className="space-y-2"
          >
            <Label htmlFor="saveName">Όνομα πελάτη / έργου</Label>
            <Input id="saveName" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            {exists && (
              <p className="text-xs text-warning">
                Υπάρχει ήδη έργο με αυτό το όνομα· θα αντικατασταθεί.
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                Άκυρο
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                <Save />
                {exists ? "Αντικατάσταση" : "Αποθήκευση"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Φόρτωση Έργου</DialogTitle>
            <DialogDescription>Αποθηκευμένοι πίνακες σε αυτή τη συσκευή.</DialogDescription>
          </DialogHeader>
          {projects.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν αποθηκευμένα έργα ακόμα.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-md border border-border">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.config.supply === "mono" ? "1Φ" : "3Φ"} · {p.config.circuits.length}{" "}
                      γραμμές · {when(p.savedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        onLoad(p.config);
                        setLoadOpen(false);
                        toast.success(`Φορτώθηκε το «${p.name}».`);
                      }}
                    >
                      Φόρτωση
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Διαγραφή ${p.name}`}
                      onClick={() => {
                        if (window.confirm(`Διαγραφή του έργου «${p.name}»;`))
                          setProjects(deleteProject(p.id));
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Έτοιμα Πρότυπα Έργων</DialogTitle>
            <DialogDescription>
              Επιλέξτε ένα έτοιμο πρότυπο για γρήγονη εκκίνηση. Θα αντικαταστήσει τον τρέχοντα
              πίνακα.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {TEMPLATES.map((t) => {
              const preview = t.build();
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-electric hover:bg-electric-soft/50"
                    onClick={() => {
                      onLoad(startNumberedProject(preview));
                      setTemplatesOpen(false);
                      toast.success(`Φορτώθηκε το πρότυπο «${t.name}».`);
                    }}
                  >
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                    <p className="mt-1 font-mono text-[11px] text-electric-ink">
                      {preview.supply === "mono" ? "1Φ" : "3Φ"} · {preview.circuits.length} γραμμές
                      · {preview.mainFuse}A
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
