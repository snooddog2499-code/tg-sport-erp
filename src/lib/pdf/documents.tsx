import "server-only";
import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Sarabun",
  fonts: [
    {
      src: path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "public/fonts/Sarabun-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
});

export const COMPANY = {
  name: "บริษัท ทีจี สปอร์ต ดีไซน์ จำกัด",
  nameEn: "TG SPORT DESIGN",
  branch: "สำนักงานใหญ่",
  tagline: "รับผลิตเสื้อกีฬา · เสื้อทีม · เสื้อพิมพ์ลาย Sublimation",
  address:
    "247 หมู่ที่ 11 ตำบลกมลาไสย อำเภอกมลาไสย จังหวัดกาฬสินธุ์ 46130",
  taxId: "0465568000618",
  phone: "080-210-2228",
  fbPage: "facebook.com/TGSportsDesign",
};

type OrderItem = {
  garmentType: string;
  collar?: string | null;
  qty: number;
  unitPrice: number;
  sizeBreakdown: string | null;
  note: string | null;
};

type CustomerInfo = {
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
};

type OrderInfo = {
  code: string;
  deadline: string | null;
  notes: string | null;
  total: number;
  deposit: number;
  paid: number;
  createdAt: string;
  discount?: number;
  shipping?: number;
  vatRate?: number;
  vatAmount?: number;
  dealerDiscount?: number;
  sizeSurcharge?: number;
  requiresDeposit?: boolean;
  // Optional metadata for quotation header
  salesName?: string | null; // ผู้ขาย (creator's name/email)
  projectName?: string | null; // ชื่องาน (defaults to first line of notes)
};

function formatBaht(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTH(s: string | null | undefined): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Convert a baht amount to Thai text — used for "(หกพันหนึ่งร้อยสิบห้าบาทถ้วน)"
function bahtToThaiText(num: number): string {
  const DIGITS = [
    "",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];
  const POS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

  function under1m(n: number): string {
    if (n === 0) return "";
    const digits = String(n).split("").map(Number);
    let s = "";
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const d = digits[i];
      const pos = len - 1 - i; // positional power (0=ones, 1=tens, ...)
      if (d === 0) continue;
      if (pos === 1) {
        if (d === 1) {
          s += "สิบ";
        } else if (d === 2) {
          s += "ยี่สิบ";
        } else {
          s += DIGITS[d] + "สิบ";
        }
      } else if (pos === 0) {
        // ones place: เอ็ด instead of หนึ่ง when there are higher digits
        if (d === 1 && len > 1) s += "เอ็ด";
        else s += DIGITS[d];
      } else {
        s += DIGITS[d] + POS[pos];
      }
    }
    return s;
  }

  function fullNumber(n: number): string {
    if (n === 0) return "ศูนย์";
    if (n < 1_000_000) return under1m(n);
    const million = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    return fullNumber(million) + "ล้าน" + (rest > 0 ? under1m(rest) : "");
  }

  // Round to 2 decimals, split baht + satang
  const rounded = Math.round(num * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);

  const bahtText = fullNumber(baht);
  let s = bahtText + "บาท";
  if (satang > 0) {
    s += under1m(satang) + "สตางค์";
  } else {
    s += "ถ้วน";
  }
  return s;
}

function formatSizeBreakdown(s: string | null): string {
  if (!s) return "";
  try {
    const obj = JSON.parse(s) as Record<string, number>;
    return Object.entries(obj)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Sarabun",
    fontSize: 10,
    color: "#18181b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#ef4c23",
    paddingBottom: 12,
  },
  brandBlock: { flexDirection: "row", gap: 10, alignItems: "center" },
  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: "#ef4c23",
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
    paddingTop: 4,
    borderRadius: 6,
  },
  brandName: { fontSize: 16, fontWeight: "bold", color: "#09090b" },
  tagline: { fontSize: 8, color: "#52525b" },
  companyInfo: { fontSize: 8, color: "#52525b", lineHeight: 1.5 },
  docTitleBlock: { alignItems: "flex-end" },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ef4c23",
    letterSpacing: 1,
  },
  docSubtitle: { fontSize: 8, color: "#52525b", marginTop: 2 },
  docMeta: { fontSize: 9, color: "#3f3f46", marginTop: 6, textAlign: "right" },
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 16 },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fafafa",
  },
  infoLabel: {
    fontSize: 8,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 10, color: "#18181b", lineHeight: 1.5 },
  infoValueBold: { fontSize: 11, fontWeight: "bold", color: "#09090b" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    color: "white",
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  col_no: { width: 28, textAlign: "center" },
  col_item: { flex: 3 },
  col_size: { flex: 2, fontSize: 8, color: "#52525b" },
  col_qty: { width: 40, textAlign: "right" },
  col_price: { width: 70, textAlign: "right" },
  col_total: { width: 80, textAlign: "right" },
  totalBlock: { alignItems: "flex-end", marginTop: 12 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 10, color: "#52525b" },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#18181b",
    minWidth: 90,
    textAlign: "right",
  },
  grandTotal: {
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 2,
    borderTopColor: "#18181b",
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signBlock: { alignItems: "center", width: 180 },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: "#a1a1aa",
    width: "100%",
    marginTop: 32,
    marginBottom: 4,
  },
  signLabel: { fontSize: 8, color: "#71717a" },
  notes: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    fontSize: 9,
    color: "#78350f",
  },
  terms: {
    marginTop: 20,
    fontSize: 8,
    color: "#71717a",
    lineHeight: 1.6,
  },
});

// ─────────────── Quotation-specific styles (matches printed reference) ───
const qStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Sarabun",
    fontSize: 10,
    color: "#000",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  // Left: logo + company info
  leftBlock: { width: "55%" },
  logoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#000",
    color: "#fff",
    textAlign: "center",
    paddingTop: 14,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  logoText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
    letterSpacing: 1.5,
  },
  companyName: { fontSize: 10, color: "#000", marginTop: 4 },
  companyLine: {
    fontSize: 9,
    color: "#3f3f46",
    marginTop: 1,
    lineHeight: 1.4,
  },
  // Right: doc title + meta
  rightBlock: { width: "42%", alignItems: "flex-end" },
  qDocTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 14,
  },
  metaGrid: { width: "100%" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  metaLabel: {
    width: 60,
    fontSize: 9,
    color: "#52525b",
    textAlign: "right",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 9,
    color: "#000",
    minWidth: 140,
    textAlign: "left",
  },
  // Customer
  custRow: { marginTop: 8, marginBottom: 12 },
  custLabel: { fontSize: 9, color: "#52525b" },
  custName: { fontSize: 11, color: "#000", marginTop: 1 },
  // Items table
  qTable: {
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 4,
  },
  qHead: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 6,
    fontSize: 9,
    fontWeight: "bold",
  },
  qHeadCell: {
    textAlign: "center",
    paddingHorizontal: 4,
  },
  qRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a1a1aa",
    paddingVertical: 5,
    fontSize: 9,
  },
  qCellNo: { width: 40, textAlign: "center" },
  qCellDesc: { flex: 1, paddingHorizontal: 6 },
  qDescTitle: {
    fontSize: 9,
    color: "#000",
    fontWeight: "bold",
  },
  qDescNote: {
    fontSize: 8,
    color: "#52525b",
    marginTop: 3,
    fontStyle: "normal",
  },
  qCellQty: { width: 70, paddingHorizontal: 4, fontWeight: "bold" },
  qCellPrice: { width: 80, textAlign: "right", paddingHorizontal: 6 },
  qCellTotal: {
    width: 80,
    textAlign: "right",
    paddingHorizontal: 6,
    fontWeight: "bold",
  },
  // Per-size sub-rows: same column widths as the main row, indented
  // and rendered in a softer tone so the eye treats them as detail.
  qSubRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 0,
    backgroundColor: "#fafafa",
  },
  qCellDescSub: {
    flex: 1,
    paddingHorizontal: 6,
    fontSize: 9,
    color: "#3f3f46",
  },
  qCellQtySub: {
    width: 70,
    paddingHorizontal: 4,
    fontSize: 9,
    color: "#000",
  },
  qCellPriceSub: {
    width: 80,
    textAlign: "right",
    paddingHorizontal: 6,
    fontSize: 9,
    color: "#3f3f46",
  },
  qCellTotalSub: {
    width: 80,
    textAlign: "right",
    paddingHorizontal: 6,
    fontSize: 9,
    color: "#000",
  },
  // Summary
  qSummary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 280,
  },
  qSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 10,
  },
  qSummaryLabel: { color: "#3f3f46" },
  qSummaryValue: { fontWeight: "bold", color: "#000" },
  qSummaryGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "bold",
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 2,
  },
  // In words
  qInWords: {
    marginTop: 8,
    fontSize: 9,
    color: "#3f3f46",
  },
  // Notes
  qNotes: { marginTop: 16 },
  qNotesHeader: { fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  qNoteLine: {
    fontSize: 9,
    color: "#3f3f46",
    lineHeight: 1.5,
  },
  // Footer: name lines + signature blocks
  qFooter: { marginTop: 32 },
  qNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  qNameItem: { width: "45%" },
  qNameLabel: { fontSize: 9, color: "#3f3f46" },
  qNameValue: { fontSize: 10, color: "#000", marginTop: 1 },
  qLogoCenter: {
    alignSelf: "center",
    marginVertical: 12,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#000",
  },
  qSignRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  qSignCell: {
    width: "45%",
    alignItems: "center",
  },
  qSignLine: {
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: "#000",
    marginBottom: 4,
  },
  qSignLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    fontSize: 9,
    color: "#3f3f46",
  },
});

function CompanyHeader({
  docTitle,
  docTitleEn,
  docNumber,
  docDate,
}: {
  docTitle: string;
  docTitleEn: string;
  docNumber: string;
  docDate: string;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandBlock}>
        <Text style={styles.brandMark}>T</Text>
        <View>
          <Text style={styles.brandName}>{COMPANY.name}</Text>
          <Text style={styles.tagline}>{COMPANY.tagline}</Text>
          <Text style={styles.companyInfo}>
            {COMPANY.address} · {COMPANY.fbPage}
          </Text>
        </View>
      </View>
      <View style={styles.docTitleBlock}>
        <Text style={styles.docTitle}>{docTitle}</Text>
        <Text style={styles.docSubtitle}>{docTitleEn}</Text>
        <Text style={styles.docMeta}>เลขที่: {docNumber}</Text>
        <Text style={styles.docMeta}>วันที่: {docDate}</Text>
      </View>
    </View>
  );
}

function CustomerBlock({
  customer,
  order,
}: {
  customer: CustomerInfo;
  order: OrderInfo;
}) {
  return (
    <View style={styles.twoCol}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>ลูกค้า · Customer</Text>
        <Text style={styles.infoValueBold}>{customer.name}</Text>
        {customer.phone && (
          <Text style={styles.infoValue}>โทร: {customer.phone}</Text>
        )}
        {customer.email && (
          <Text style={styles.infoValue}>อีเมล: {customer.email}</Text>
        )}
        {customer.address && (
          <Text style={styles.infoValue}>{customer.address}</Text>
        )}
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>ออเดอร์ · Order</Text>
        <Text style={styles.infoValueBold}>{order.code}</Text>
        {order.deadline && (
          <Text style={styles.infoValue}>
            กำหนดส่ง: {formatDateTH(order.deadline)}
          </Text>
        )}
      </View>
    </View>
  );
}

function ItemsTable({ items }: { items: OrderItem[] }) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.col_no}>#</Text>
        <Text style={styles.col_item}>รายการ</Text>
        <Text style={styles.col_size}>ไซส์</Text>
        <Text style={styles.col_qty}>จำนวน</Text>
        <Text style={styles.col_price}>ราคา/ตัว</Text>
        <Text style={styles.col_total}>รวม</Text>
      </View>
      {items.map((it, i) => {
        const lineTotal = it.qty * (it.unitPrice ?? 0);
        return (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.col_no}>{i + 1}</Text>
            <View style={styles.col_item}>
              <Text>{it.garmentType}</Text>
              {it.note && (
                <Text style={{ fontSize: 8, color: "#71717a", marginTop: 2 }}>
                  {it.note}
                </Text>
              )}
            </View>
            <Text style={styles.col_size}>
              {formatSizeBreakdown(it.sizeBreakdown)}
            </Text>
            <Text style={styles.col_qty}>{it.qty}</Text>
            <Text style={styles.col_price}>{formatBaht(it.unitPrice ?? 0)}</Text>
            <Text style={styles.col_total}>{formatBaht(lineTotal)}</Text>
          </View>
        );
      })}
      {items.length === 0 && (
        <View style={styles.tableRow}>
          <Text
            style={{ flex: 1, textAlign: "center", color: "#a1a1aa" }}
          >
            ยังไม่มีรายการ
          </Text>
        </View>
      )}
    </View>
  );
}

function Signatures() {
  return (
    <View style={styles.footer}>
      <View style={styles.signBlock}>
        <View style={styles.signLine} />
        <Text style={styles.signLabel}>ลูกค้า · Customer</Text>
        <Text style={styles.signLabel}>วันที่ ....../....../......</Text>
      </View>
      <View style={styles.signBlock}>
        <View style={styles.signLine} />
        <Text style={styles.signLabel}>ผู้มีอำนาจลงนาม · Authorized</Text>
        <Text style={styles.signLabel}>วันที่ ....../....../......</Text>
      </View>
    </View>
  );
}

// Parse the JSON sizeBreakdown into an ordered list of {size, qty}
// entries so the quotation can render one size per line instead of
// a single cramped string.
function sizeBreakdownEntries(
  raw: string | null
): { size: string; qty: number }[] {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw) as Record<string, number>;
    return Object.entries(obj)
      .filter(([, v]) => v > 0)
      .map(([size, qty]) => ({ size, qty }));
  } catch {
    return [];
  }
}

export function QuotationPDF({
  order,
  customer,
  items,
}: {
  order: OrderInfo;
  customer: CustomerInfo;
  items: OrderItem[];
}) {
  const subtotal = items.reduce(
    (s, it) => s + it.qty * (it.unitPrice ?? 0),
    0
  );
  const surcharges =
    (order.sizeSurcharge ?? 0) - (order.dealerDiscount ?? 0) -
    (order.discount ?? 0) +
    (order.shipping ?? 0);
  const beforeVat = subtotal + surcharges;
  const vatAmount = order.vatAmount ?? 0;
  const grandTotal = order.total || beforeVat + vatAmount;

  const vatPct = ((order.vatRate ?? 0) * 100).toFixed(0);

  // ชื่องาน: first line of notes if present, else dash
  const projectName =
    order.projectName ??
    (order.notes ? order.notes.split("\n")[0].slice(0, 80) : null);
  // Notes (excluding the first line if it was used as project name)
  const noteBody = order.notes
    ? order.projectName
      ? order.notes
      : order.notes.split("\n").slice(1).join("\n").trim()
    : "";

  return (
    <Document>
      <Page size="A4" style={qStyles.page}>
        {/* Top: logo + company info on left, doc title + meta on right */}
        <View style={qStyles.topRow}>
          <View style={qStyles.leftBlock}>
            <View style={qStyles.logoBox}>
              <Text style={qStyles.logoMark}>TG</Text>
              <Text style={qStyles.logoText}>{COMPANY.nameEn}</Text>
            </View>
            <Text style={qStyles.companyName}>
              {COMPANY.name} ({COMPANY.branch})
            </Text>
            <Text style={qStyles.companyLine}>ที่อยู่ {COMPANY.address}</Text>
            <Text style={qStyles.companyLine}>
              เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}
            </Text>
            <Text style={qStyles.companyLine}>โทร. {COMPANY.phone}</Text>
          </View>
          <View style={qStyles.rightBlock}>
            <Text style={qStyles.qDocTitle}>ใบเสนอราคา</Text>
            <View style={qStyles.metaGrid}>
              <View style={qStyles.metaRow}>
                <Text style={qStyles.metaLabel}>เลขที่</Text>
                <Text style={qStyles.metaValue}>{order.code}</Text>
              </View>
              <View style={qStyles.metaRow}>
                <Text style={qStyles.metaLabel}>วันที่</Text>
                <Text style={qStyles.metaValue}>
                  {formatDateTH(order.createdAt)}
                </Text>
              </View>
              {order.salesName && (
                <View style={qStyles.metaRow}>
                  <Text style={qStyles.metaLabel}>ผู้ขาย</Text>
                  <Text style={qStyles.metaValue}>{order.salesName}</Text>
                </View>
              )}
              {projectName && (
                <View style={qStyles.metaRow}>
                  <Text style={qStyles.metaLabel}>ชื่องาน</Text>
                  <Text style={qStyles.metaValue}>{projectName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={qStyles.custRow}>
          <Text style={qStyles.custLabel}>ลูกค้า</Text>
          <Text style={qStyles.custName}>{customer.name}</Text>
          {customer.address && (
            <Text style={qStyles.companyLine}>{customer.address}</Text>
          )}
        </View>

        {/* Items */}
        <View style={qStyles.qTable}>
          <View style={qStyles.qHead}>
            <Text style={[qStyles.qCellNo, qStyles.qHeadCell]}>ลำดับ</Text>
            <Text style={[qStyles.qCellDesc, qStyles.qHeadCell]}>
              รายละเอียด
            </Text>
            <Text style={[qStyles.qCellQty, qStyles.qHeadCell]}>จำนวน</Text>
            <Text style={[qStyles.qCellPrice, qStyles.qHeadCell]}>
              ราคาต่อหน่วย
            </Text>
            <Text style={[qStyles.qCellTotal, qStyles.qHeadCell]}>ยอดรวม</Text>
          </View>
          {items.length === 0 && (
            <View style={qStyles.qRow}>
              <Text
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: "#a1a1aa",
                }}
              >
                ยังไม่มีรายการ
              </Text>
            </View>
          )}
          {items.map((it, i) => {
            const unitPrice = it.unitPrice ?? 0;
            const lineTotal = it.qty * unitPrice;
            const sizes = sizeBreakdownEntries(it.sizeBreakdown);
            const title = it.collar
              ? `${it.garmentType} · ${it.collar}`.trim()
              : it.garmentType;
            return (
              <React.Fragment key={i}>
                {/* Item header row — bold totals across the full width */}
                <View
                  style={[qStyles.qRow, { alignItems: "flex-start" }]}
                >
                  <Text style={qStyles.qCellNo}>{i + 1}</Text>
                  <View style={qStyles.qCellDesc}>
                    <Text style={qStyles.qDescTitle}>{title}</Text>
                    {it.note && (
                      <Text style={qStyles.qDescNote}>
                        หมายเหตุ: {it.note}
                      </Text>
                    )}
                  </View>
                  <Text style={qStyles.qCellQty}>{it.qty} ตัว</Text>
                  <Text style={qStyles.qCellPrice}>{formatBaht(unitPrice)}</Text>
                  <Text style={qStyles.qCellTotal}>{formatBaht(lineTotal)}</Text>
                </View>

                {/* Per-size breakdown — same column widths, indented */}
                {sizes.map((s) => {
                  const sizeTotal = s.qty * unitPrice;
                  return (
                    <View key={`${i}-${s.size}`} style={qStyles.qSubRow}>
                      <Text style={qStyles.qCellNo}></Text>
                      <Text style={qStyles.qCellDescSub}>
                        {"   • ไซส์ "}
                        {s.size}
                      </Text>
                      <Text style={qStyles.qCellQtySub}>{s.qty} ตัว</Text>
                      <Text style={qStyles.qCellPriceSub}>
                        {formatBaht(unitPrice)}
                      </Text>
                      <Text style={qStyles.qCellTotalSub}>
                        {formatBaht(sizeTotal)}
                      </Text>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>

        {/* Summary */}
        <View style={qStyles.qSummary}>
          <View style={qStyles.qSummaryRow}>
            <Text style={qStyles.qSummaryLabel}>รวมเป็นเงิน</Text>
            <Text style={qStyles.qSummaryValue}>
              {formatBaht(subtotal)} บาท
            </Text>
          </View>
          {(order.sizeSurcharge ?? 0) > 0 && (
            <View style={qStyles.qSummaryRow}>
              <Text style={qStyles.qSummaryLabel}>
                เพิ่มไซส์ใหญ่ (3XL+)
              </Text>
              <Text style={qStyles.qSummaryValue}>
                + {formatBaht(order.sizeSurcharge ?? 0)} บาท
              </Text>
            </View>
          )}
          {(order.dealerDiscount ?? 0) > 0 && (
            <View style={qStyles.qSummaryRow}>
              <Text style={qStyles.qSummaryLabel}>ส่วนลดตัวแทน</Text>
              <Text style={qStyles.qSummaryValue}>
                − {formatBaht(order.dealerDiscount ?? 0)} บาท
              </Text>
            </View>
          )}
          {(order.discount ?? 0) > 0 && (
            <View style={qStyles.qSummaryRow}>
              <Text style={qStyles.qSummaryLabel}>ส่วนลด</Text>
              <Text style={qStyles.qSummaryValue}>
                − {formatBaht(order.discount ?? 0)} บาท
              </Text>
            </View>
          )}
          {(order.shipping ?? 0) > 0 && (
            <View style={qStyles.qSummaryRow}>
              <Text style={qStyles.qSummaryLabel}>ค่าขนส่ง</Text>
              <Text style={qStyles.qSummaryValue}>
                + {formatBaht(order.shipping ?? 0)} บาท
              </Text>
            </View>
          )}
          <View style={qStyles.qSummaryRow}>
            <Text style={qStyles.qSummaryLabel}>
              ภาษีมูลค่าเพิ่ม {vatPct}%
            </Text>
            <Text style={qStyles.qSummaryValue}>
              {formatBaht(vatAmount)} บาท
            </Text>
          </View>
          <View style={qStyles.qSummaryGrand}>
            <Text>จำนวนเงินรวมทั้งสิ้น</Text>
            <Text>{formatBaht(grandTotal)} บาท</Text>
          </View>
        </View>

        {/* Amount in words */}
        <Text style={qStyles.qInWords}>({bahtToThaiText(grandTotal)})</Text>

        {/* Notes */}
        {noteBody && (
          <View style={qStyles.qNotes}>
            <Text style={qStyles.qNotesHeader}>หมายเหตุ</Text>
            {noteBody.split("\n").map((line, i) => (
              <Text key={i} style={qStyles.qNoteLine}>
                {line}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={qStyles.qFooter}>
          <View style={qStyles.qNameRow}>
            <View style={qStyles.qNameItem}>
              <Text style={qStyles.qNameLabel}>ในนาม</Text>
              <Text style={qStyles.qNameValue}>{customer.name}</Text>
            </View>
            <View style={[qStyles.qNameItem, { alignItems: "flex-end" }]}>
              <Text style={qStyles.qNameLabel}>ในนาม</Text>
              <Text style={qStyles.qNameValue}>{COMPANY.name}</Text>
            </View>
          </View>
          <Text style={qStyles.qLogoCenter}>{COMPANY.nameEn}</Text>
          <View style={qStyles.qSignRow}>
            <View style={qStyles.qSignCell}>
              <View style={qStyles.qSignLine} />
              <View style={qStyles.qSignLabelRow}>
                <Text>ผู้สั่งซื้อสินค้า</Text>
                <Text>วันที่</Text>
              </View>
            </View>
            <View style={qStyles.qSignCell}>
              <View style={qStyles.qSignLine} />
              <View style={qStyles.qSignLabelRow}>
                <Text>ผู้อนุมัติ</Text>
                <Text>วันที่</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function InvoicePDF({
  order,
  customer,
  items,
  invoiceNo,
}: {
  order: OrderInfo;
  customer: CustomerInfo;
  items: OrderItem[];
  invoiceNo: string;
}) {
  const subtotal = items.reduce(
    (s, it) => s + it.qty * (it.unitPrice ?? 0),
    0
  );
  const balance = order.total - order.paid;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CompanyHeader
          docTitle="ใบส่งของ / ใบกำกับภาษี"
          docTitleEn="DELIVERY NOTE / TAX INVOICE"
          docNumber={invoiceNo}
          docDate={formatDateTH(new Date().toISOString())}
        />
        <CustomerBlock customer={customer} order={order} />
        <ItemsTable items={items} />

        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดสินค้า</Text>
            <Text style={styles.totalValue}>{formatBaht(subtotal)}</Text>
          </View>
          {(order.sizeSurcharge ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>เพิ่มไซส์ใหญ่ (3XL+)</Text>
              <Text style={styles.totalValue}>
                + {formatBaht(order.sizeSurcharge ?? 0)}
              </Text>
            </View>
          )}
          {(order.dealerDiscount ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ส่วนลดตัวแทน</Text>
              <Text style={styles.totalValue}>
                − {formatBaht(order.dealerDiscount ?? 0)}
              </Text>
            </View>
          )}
          {(order.discount ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ส่วนลด</Text>
              <Text style={styles.totalValue}>
                − {formatBaht(order.discount ?? 0)}
              </Text>
            </View>
          )}
          {(order.shipping ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ค่าขนส่ง</Text>
              <Text style={styles.totalValue}>
                + {formatBaht(order.shipping ?? 0)}
              </Text>
            </View>
          )}
          {(order.vatAmount ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                VAT {((order.vatRate ?? 0) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.totalValue}>
                + {formatBaht(order.vatAmount ?? 0)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดสุทธิ</Text>
            <Text style={styles.totalValue}>
              {formatBaht(order.total || subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ชำระแล้ว</Text>
            <Text style={[styles.totalValue, { color: "#059669" }]}>
              {formatBaht(order.paid)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={{ color: "#18181b" }}>
              {balance > 0 ? "คงเหลือต้องชำระ" : "ครบถ้วน"}
            </Text>
            <Text
              style={{
                minWidth: 90,
                textAlign: "right",
                color: balance > 0 ? "#b91c1c" : "#059669",
              }}
            >
              {formatBaht(balance > 0 ? balance : 0)} บาท
            </Text>
          </View>
        </View>

        {order.notes && (
          <View style={styles.notes}>
            <Text>หมายเหตุ: {order.notes}</Text>
          </View>
        )}

        <View style={styles.terms}>
          <Text>· ได้รับสินค้าครบถ้วนในสภาพสมบูรณ์</Text>
          <Text>· หากพบความผิดพลาด โปรดแจ้งภายใน 7 วันนับจากวันรับสินค้า</Text>
        </View>

        <Signatures />
      </Page>
    </Document>
  );
}

const workStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#18181b",
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ef4c23",
    letterSpacing: 1,
  },
  titleEn: { fontSize: 9, color: "#52525b" },
  codeBlock: { alignItems: "flex-end" },
  orderCode: { fontSize: 20, fontWeight: "bold", color: "#09090b" },
  deadline: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#b91c1c",
    marginTop: 2,
  },
  infoStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  infoChunk: {
    flex: 1,
    padding: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
  },
  chunkLabel: {
    fontSize: 8,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  chunkValue: { fontSize: 11, fontWeight: "bold", color: "#09090b" },
  sectionHead: {
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#18181b",
    color: "white",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    alignItems: "center",
  },
  itemGarment: { flex: 2, fontSize: 11, fontWeight: "bold" },
  itemQty: {
    width: 50,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemSize: { flex: 3, fontSize: 10, color: "#18181b" },
  sizeGrid: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 3,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: "#18181b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 10,
  },
  sizeLabel: { fontWeight: "bold" },
  mockupRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  mockup: {
    width: 160,
    height: 120,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#fafafa",
  },
  mockupPlaceholder: {
    width: 160,
    height: 120,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontSize: 9, color: "#a1a1aa" },
  mockupCaption: { fontSize: 8, color: "#52525b", marginTop: 2 },
  stagesRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  stageBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#18181b",
    padding: 6,
    minHeight: 58,
  },
  stageName: { fontSize: 9, fontWeight: "bold", marginBottom: 2 },
  stageCheck: { fontSize: 7, color: "#71717a", marginTop: 1 },
  stageCheckbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: "#18181b",
    marginBottom: 4,
  },
  notesBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#f59e0b",
    minHeight: 40,
  },
});

type DesignMock = {
  version: number;
  imageData: string | null;
  status: string;
};

const stageOrder = [
  "graphic",
  "print",
  "roll",
  "laser",
  "sew",
  "qc",
  "pack",
  "ship",
] as const;
const stageLabelTh: Record<(typeof stageOrder)[number], string> = {
  graphic: "กราฟฟิก",
  print: "พิมพ์",
  roll: "รีดโรล",
  laser: "ตัดเลเซอร์",
  sew: "เย็บ",
  qc: "รีด+QC",
  pack: "พับแพ็ค",
  ship: "จัดส่ง",
};

function parseSizeDetail(s: string | null): Array<[string, number]> {
  if (!s) return [];
  try {
    const obj = JSON.parse(s) as Record<string, number>;
    return Object.entries(obj).filter(([, v]) => v > 0);
  } catch {
    return [];
  }
}

export function WorkOrderPDF({
  order,
  customer,
  items,
  designs,
  attachments = [],
  stages,
}: {
  order: OrderInfo;
  customer: CustomerInfo;
  items: OrderItem[];
  designs: DesignMock[];
  attachments?: Array<{ fileName: string; imageData: string }>;
  stages: Array<{
    stage: (typeof stageOrder)[number];
    status: "pending" | "active" | "done";
    assignedName: string | null;
  }>;
}) {
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  const stageByName = new Map(stages.map((s) => [s.stage, s]));
  const printDate = formatDateTH(new Date().toISOString());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={workStyles.header}>
          <View>
            <Text style={workStyles.title}>ใบงาน</Text>
            <Text style={workStyles.titleEn}>WORK ORDER · {COMPANY.name}</Text>
          </View>
          <View style={workStyles.codeBlock}>
            <Text style={workStyles.orderCode}>{order.code}</Text>
            {order.deadline && (
              <Text style={workStyles.deadline}>
                กำหนดส่ง: {formatDateTH(order.deadline)}
              </Text>
            )}
          </View>
        </View>

        <View style={workStyles.infoStrip}>
          <View style={workStyles.infoChunk}>
            <Text style={workStyles.chunkLabel}>ลูกค้า</Text>
            <Text style={workStyles.chunkValue}>{customer.name}</Text>
            {customer.phone && (
              <Text style={{ fontSize: 9, color: "#52525b" }}>
                โทร {customer.phone}
              </Text>
            )}
          </View>
          <View style={workStyles.infoChunk}>
            <Text style={workStyles.chunkLabel}>รวม</Text>
            <Text style={workStyles.chunkValue}>{totalQty} ตัว</Text>
            <Text style={{ fontSize: 9, color: "#52525b" }}>
              {items.length} รายการ
            </Text>
          </View>
          <View style={workStyles.infoChunk}>
            <Text style={workStyles.chunkLabel}>พิมพ์ใบงาน</Text>
            <Text style={workStyles.chunkValue}>{printDate}</Text>
            <Text style={{ fontSize: 9, color: "#52525b" }}>
              สั่งเมื่อ {formatDateTH(order.createdAt)}
            </Text>
          </View>
        </View>

        <Text style={workStyles.sectionHead}>รายการ · ไซส์</Text>
        {items.length === 0 ? (
          <Text style={{ fontSize: 10, color: "#a1a1aa", padding: 6 }}>
            ยังไม่มีรายการ
          </Text>
        ) : (
          items.map((it, i) => {
            const sizes = parseSizeDetail(it.sizeBreakdown);
            return (
              <View key={i} style={workStyles.itemRow}>
                <View style={workStyles.itemGarment}>
                  <Text>{it.garmentType}</Text>
                  {it.collar && (
                    <Text style={{ fontSize: 9, color: "#ef4c23", marginTop: 1, fontWeight: "bold" }}>
                      คอ: {it.collar}
                    </Text>
                  )}
                  {it.note && (
                    <Text style={{ fontSize: 8, color: "#71717a", marginTop: 1 }}>
                      {it.note}
                    </Text>
                  )}
                </View>
                <Text style={workStyles.itemQty}>{it.qty}</Text>
                <View style={workStyles.itemSize}>
                  {sizes.length > 0 ? (
                    <View style={workStyles.sizeGrid}>
                      {sizes.map(([size, qty]) => (
                        <Text key={size} style={workStyles.sizeChip}>
                          <Text style={workStyles.sizeLabel}>{size}</Text>
                          {` × ${qty}`}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 9, color: "#a1a1aa" }}>
                      ไม่ได้ระบุไซส์
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <Text style={workStyles.sectionHead}>ม็อคอัพ / ลายออกแบบ</Text>
        <View style={workStyles.mockupRow}>
          {designs.length === 0 ? (
            <View style={workStyles.mockupPlaceholder}>
              <Text style={workStyles.placeholderText}>ยังไม่มีลาย</Text>
            </View>
          ) : (
            designs.slice(0, 3).map((d, i) =>
              d.imageData ? (
                <View key={i}>
                  <Image style={workStyles.mockup} src={d.imageData} />
                  <Text style={workStyles.mockupCaption}>
                    v{d.version} · {d.status}
                  </Text>
                </View>
              ) : (
                <View key={i}>
                  <View style={workStyles.mockupPlaceholder}>
                    <Text style={workStyles.placeholderText}>
                      v{d.version} (ไฟล์ไม่ใช่รูป)
                    </Text>
                  </View>
                </View>
              )
            )
          )}
        </View>

        {attachments.length > 0 && (
          <>
            <Text style={workStyles.sectionHead}>รูปแนบจากลูกค้า</Text>
            <View style={workStyles.mockupRow}>
              {attachments.map((a, i) => (
                <View key={i}>
                  <Image style={workStyles.mockup} src={a.imageData} />
                  <Text
                    style={workStyles.mockupCaption}
                    wrap={false}
                  >
                    {a.fileName.length > 22
                      ? a.fileName.slice(0, 20) + "…"
                      : a.fileName}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={workStyles.sectionHead}>สเตจการผลิต</Text>
        <View style={workStyles.stagesRow}>
          {stageOrder.map((s) => {
            const st = stageByName.get(s);
            return (
              <View key={s} style={workStyles.stageBox}>
                <Text style={workStyles.stageName}>{stageLabelTh[s]}</Text>
                <View style={workStyles.stageCheckbox} />
                <Text style={workStyles.stageCheck}>
                  {st?.status === "done"
                    ? "เสร็จแล้ว ✓"
                    : st?.status === "active"
                      ? "กำลังทำ"
                      : "รอ"}
                </Text>
                {st?.assignedName && (
                  <Text style={workStyles.stageCheck}>
                    ผู้รับ: {st.assignedName}
                  </Text>
                )}
                <Text style={workStyles.stageCheck}>วันที่เสร็จ: ........</Text>
              </View>
            );
          })}
        </View>

        <Text style={workStyles.sectionHead}>หมายเหตุ / ข้อสั่งพิเศษ</Text>
        <View style={workStyles.notesBox}>
          <Text style={{ fontSize: 10 }}>{order.notes ?? "-"}</Text>
        </View>
      </Page>
    </Document>
  );
}
