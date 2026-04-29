import "server-only";

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast";

type TextMessage = { type: "text"; text: string };
type Message = TextMessage;

function isConfigured(): boolean {
  return !!LINE_CHANNEL_TOKEN && LINE_CHANNEL_TOKEN.length > 10;
}

async function sendLineRequest(
  url: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!isConfigured()) {
    console.warn("[line] LINE_CHANNEL_ACCESS_TOKEN not configured — skipping");
    return { ok: false, status: 0, error: "not configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[line] send failed:", res.status, text);
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[line] exception:", msg);
    return { ok: false, status: 0, error: msg };
  }
}

export async function pushToLineUser(
  userLineId: string,
  text: string
): Promise<boolean> {
  const messages: Message[] = [{ type: "text", text }];
  const res = await sendLineRequest(LINE_PUSH_URL, {
    to: userLineId,
    messages,
  });
  return res.ok;
}

export async function broadcastToLineFollowers(
  text: string
): Promise<boolean> {
  const messages: Message[] = [{ type: "text", text }];
  const res = await sendLineRequest(LINE_BROADCAST_URL, { messages });
  return res.ok;
}

export async function notifyCustomerDesignSent(params: {
  customerLineId: string | null;
  customerName: string;
  orderCode: string;
  approvalUrl: string;
  version: number;
}): Promise<boolean> {
  if (!params.customerLineId) return false;
  const text = [
    `สวัสดีคุณ ${params.customerName}`,
    ``,
    `ลายออกแบบสำหรับออเดอร์ ${params.orderCode} (v${params.version}) พร้อมให้ตรวจแล้ว`,
    ``,
    `เปิดดูและกดอนุมัติได้ที่:`,
    params.approvalUrl,
    ``,
    `— ทีมงาน TG Sport`,
  ].join("\n");
  return pushToLineUser(params.customerLineId, text);
}

export async function notifyCustomerOrderReady(params: {
  customerLineId: string | null;
  customerName: string;
  orderCode: string;
}): Promise<boolean> {
  if (!params.customerLineId) return false;
  const text = [
    `สวัสดีคุณ ${params.customerName}`,
    ``,
    `ออเดอร์ ${params.orderCode} ผลิตเสร็จแล้ว พร้อมให้มารับของ/นัดจัดส่ง`,
    ``,
    `— ทีมงาน TG Sport`,
  ].join("\n");
  return pushToLineUser(params.customerLineId, text);
}

export function lineConfigStatus(): "configured" | "missing" {
  return isConfigured() ? "configured" : "missing";
}
