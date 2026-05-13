import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl } from "./format";

export interface ProposalData {
  numero: string;
  cliente: { razao_social?: string; nome_fantasia?: string; cnpj?: string };
  valor_implantacao?: number;
  valor_mensalidade?: number;
  sistema_contratado?: string[];
  modulos_adicionais?: string[];
  qtd_licencas_maquinas?: number;
  licencas_automax_mobile?: number;
  licencas_maxbip?: number;
  escopo?: string;
  prazo_dias?: number;
  condicoes_comerciais?: string;
  observacoes_comerciais?: string;
  validade_proposta_dias?: number;
  vendedor?: string;
}

export interface PdfBranding {
  cor_primaria?: string;
  logo_url?: string | null;
  header_html?: string;
  footer_html?: string;
  texto_validade_proposta?: string;
}

const stripHtml = (s?: string) => (s || "").replace(/<[^>]+>/g, "").trim();

export async function generateProposalPDF(data: ProposalData, branding: PdfBranding = {}): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const cor = branding.cor_primaria || "#C4161C";

  // Header
  doc.setFillColor(cor);
  doc.rect(0, 0, w, 80, "F");
  if (branding.logo_url) {
    try {
      const img = await fetch(branding.logo_url).then((r) => r.blob()).then(blobToDataUrl);
      doc.addImage(img, "PNG", 30, 18, 80, 44);
    } catch { /* ignore */ }
  }
  doc.setTextColor("#fff");
  doc.setFontSize(20).text("Proposta Comercial", w - 30, 38, { align: "right" });
  doc.setFontSize(10).text(`Nº ${data.numero}`, w - 30, 56, { align: "right" });

  let y = 110;
  doc.setTextColor("#000");
  doc.setFontSize(12).text("Cliente", 30, y);
  y += 6;
  doc.setDrawColor(cor); doc.setLineWidth(1.2); doc.line(30, y, w - 30, y);
  y += 14;
  doc.setFontSize(10);
  const lines = [
    ["Razão Social", data.cliente.razao_social || "—"],
    ["Nome Fantasia", data.cliente.nome_fantasia || "—"],
    ["CNPJ", data.cliente.cnpj || "—"],
    ["Vendedor", data.vendedor || "—"],
  ];
  lines.forEach(([k, v]) => { doc.setFont("helvetica", "bold").text(`${k}: `, 30, y); doc.setFont("helvetica", "normal").text(String(v), 110, y); y += 14; });

  y += 10;
  doc.setFontSize(12).setFont("helvetica", "bold").text("Itens da Proposta", 30, y); y += 8;
  doc.setLineWidth(1.2).line(30, y, w - 30, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Detalhe"]],
    body: [
      ["Sistema(s)", (data.sistema_contratado || []).join(", ") || "—"],
      ["Módulos adicionais", (data.modulos_adicionais || []).join(", ") || "—"],
      ["Licenças (máquinas)", String(data.qtd_licencas_maquinas ?? 0)],
      ["AutoMax Mobile", String(data.licencas_automax_mobile ?? 0)],
      ["MaxBip", String(data.licencas_maxbip ?? 0)],
      ["Prazo de implantação", `${data.prazo_dias ?? 0} dias`],
    ],
    headStyles: { fillColor: cor },
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY: y,
    head: [["Investimento", "Valor"]],
    body: [
      ["Implantação (à vista)", brl(data.valor_implantacao)],
      ["Mensalidade", brl(data.valor_mensalidade)],
    ],
    headStyles: { fillColor: cor },
    styles: { fontSize: 11, fontStyle: "bold" },
  });

  y = (doc as any).lastAutoTable.finalY + 18;
  const sections: Array<[string, string | undefined]> = [
    ["Escopo", data.escopo],
    ["Condições comerciais", data.condicoes_comerciais],
    ["Observações", data.observacoes_comerciais],
  ];
  sections.forEach(([title, body]) => {
    if (!body) return;
    if (y > 720) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold").setFontSize(11).text(title, 30, y); y += 14;
    doc.setFont("helvetica", "normal").setFontSize(10);
    const split = doc.splitTextToSize(body, w - 60);
    doc.text(split, 30, y); y += split.length * 12 + 10;
  });

  if (y > 720) { doc.addPage(); y = 60; }
  const validade = branding.texto_validade_proposta || `Esta proposta tem validade de ${data.validade_proposta_dias ?? 15} dias.`;
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor("#555").text(validade, 30, y);

  // Footer
  const footer = stripHtml(branding.footer_html) || "MAX SUPORTE — Sistema para analistas";
  doc.setFontSize(8).setTextColor("#888").text(footer, w / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });

  return doc.output("blob");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
