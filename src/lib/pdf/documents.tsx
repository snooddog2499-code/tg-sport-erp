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
  name: "TG Sport",
  tagline: "รับผลิตเสื้อกีฬา · เสื้อทีม · เสื้อพิมพ์ลาย Sublimation",
  address: "จังหวัดกาฬสินธุ์",
  phone: "—",
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CompanyHeader
          docTitle="ใบเสนอราคา"
          docTitleEn="QUOTATION"
          docNumber={order.code}
          docDate={formatDateTH(order.createdAt)}
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
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={{ color: "#18181b" }}>ยอดสุทธิ</Text>
            <Text
              style={{
                minWidth: 90,
                textAlign: "right",
                color: "#ef4c23",
              }}
            >
              {formatBaht(order.total || subtotal)} บาท
            </Text>
          </View>
        </View>

        {order.notes && (
          <View style={styles.notes}>
            <Text>หมายเหตุ: {order.notes}</Text>
          </View>
        )}

        <View style={styles.terms}>
          <Text>เงื่อนไข:</Text>
          <Text>· ราคานี้ยืนยันภายใน 15 วัน นับจากวันที่ออกใบเสนอราคา</Text>
          <Text>
            ·{" "}
            {order.requiresDeposit !== false
              ? "มัดจำ 50% ก่อนเริ่มผลิต ส่วนที่เหลือชำระเมื่อรับของ"
              : "ชำระเต็มจำนวนเมื่อรับสินค้า (ไม่ต้องมัดจำ)"}
          </Text>
          <Text>· ระยะเวลาผลิต 7-15 วันทำการ ขึ้นอยู่กับจำนวนและความซับซ้อนของลาย</Text>
          <Text>· ลูกค้าต้องตรวจและอนุมัติลายก่อนเริ่มผลิตจริง</Text>
        </View>

        <Signatures />
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
  stages,
}: {
  order: OrderInfo;
  customer: CustomerInfo;
  items: OrderItem[];
  designs: DesignMock[];
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
