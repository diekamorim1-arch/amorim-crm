// ImportProductsDialog — importa vários produtos do catálogo de um
// fornecedor de uma vez, a partir de um arquivo .csv/.txt/.docx com uma
// linha por produto no formato "NOME - CORES - VALOR". Parse 100%
// client-side (mammoth.js extrai o texto do .docx); mostra uma prévia com as
// linhas inválidas marcadas antes de confirmar, e envia tudo pro backend
// numa única chamada em lote (POST /suppliers/{id}/products/bulk).

import { useState, type ChangeEvent } from "react";
import mammoth from "mammoth";
import { Upload } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, api, mapSupplierProduct } from "@/lib/apiClient";
import { brl } from "@/lib/format";
import { parseProductLines, type ParsedProductRow } from "@/lib/importProducts";
import { useCrm } from "@/lib/store";

interface ImportProductsDialogProps {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }
  if (ext === "doc") {
    throw new Error('Arquivo ".doc" (Word antigo) não é suportado — use .docx, .txt ou .csv.');
  }
  return file.text();
}

export function ImportProductsDialog({ supplierId, open, onOpenChange }: ImportProductsDialogProps) {
  const { dispatch } = useCrm();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [reading, setReading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validRows = rows.filter((row) => row.valid);

  function reset() {
    setFileName("");
    setRows([]);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setRows([]);
    setReading(true);
    try {
      const text = await extractText(file);
      const parsed = parseProductLines(text);
      setRows(parsed);
      if (parsed.length === 0) {
        toast.error("Nenhuma linha encontrada no arquivo.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    } finally {
      setReading(false);
    }
  }

  async function handleConfirm() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      const created = await api.bulkCreateSupplierProducts(
        supplierId,
        validRows.map((row) => ({ name: row.name!, current_price: row.price!, colors: row.colors })),
      );
      dispatch({ type: "ADD_SUPPLIER_PRODUCTS", products: created.map(mapSupplierProduct) });
      toast.success(`${created.length} produto${created.length === 1 ? "" : "s"} importado${created.length === 1 ? "" : "s"}.`);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao importar produtos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar produtos</DialogTitle>
          <DialogDescription>
            Envie um arquivo .csv, .txt ou .docx com uma linha por produto, no formato "NOME - CORES - VALOR".
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <input
              id="import-products-file"
              type="file"
              accept=".csv,.txt,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={reading}
              onClick={() => document.getElementById("import-products-file")?.click()}
            >
              <Upload />
              {reading ? "Lendo arquivo…" : fileName ? "Trocar arquivo" : "Escolher arquivo"}
            </Button>
            {fileName && !reading && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>

          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                {validRows.length} de {rows.length} linha{rows.length === 1 ? "" : "s"} válida
                {validRows.length === 1 ? "" : "s"}
              </p>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cores</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={index} className={row.valid ? undefined : "bg-destructive/5"}>
                        {row.valid ? (
                          <>
                            <TableCell>{row.name}</TableCell>
                            <TableCell className="text-muted-foreground">{row.colors ?? "—"}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{brl(row.price!)}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={3} className="text-xs text-destructive">
                            Linha inválida — {row.error}: "{row.raw}"
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={validRows.length === 0 || submitting}>
            {submitting ? "Importando…" : `Importar ${validRows.length} produto${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
