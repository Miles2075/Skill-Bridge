import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

const COURSE_PRICES: Record<string, { title: string; price: number }> = {
  "c-ts": { title: "Advanced TypeScript & Design Patterns", price: 1299 },
  "c-react": { title: "React Performance & Architecture", price: 1499 },
  "c-sys": { title: "System Design Fundamentals", price: 999 },
  "c-dsa": { title: "Data Structures & Algorithms", price: 799 },
};

function getRazorpayCredentials() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret)
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.",
    );
  return { keyId, keySecret };
}

async function razorpayRequest(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, { ...init, headers });
  const body = await response.text();
  let data: {
    id?: string;
    amount?: number;
    currency?: string;
    order_id?: string;
    notes?: { course_id?: string };
    status?: string;
    error?: { description?: string };
  } = {};
  try {
    data = JSON.parse(body);
  } catch {
    data = { error: { description: body } };
  }
  if (!response.ok) throw new Error(data?.error?.description || "Razorpay request failed");
  return data;
}

export const createCourseOrder = createServerFn({ method: "POST" })
  .validator((d) => z.object({ courseId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const course = COURSE_PRICES[data.courseId];
    if (!course) throw new Error("Course not found");
    const { keyId } = getRazorpayCredentials();
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: course.price * 100,
        currency: "INR",
        receipt: `course_${data.courseId}_${Date.now()}`.slice(0, 40),
        notes: { course_id: data.courseId, course_title: course.title },
      }),
    });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      title: course.title,
      isTestMode: keyId.startsWith("rzp_test_"),
    };
  });

export const verifyCoursePayment = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        courseId: z.string().min(1).max(100),
        orderId: z.string().min(1).max(120),
        paymentId: z.string().min(1).max(120),
        signature: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const course = COURSE_PRICES[data.courseId];
    if (!course) throw new Error("Course not found");
    const { keySecret } = getRazorpayCredentials();
    const expected = createHmac("sha256", keySecret)
      .update(`${data.orderId}|${data.paymentId}`)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(data.signature, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new Error("Payment signature verification failed");

    const [order, payment] = await Promise.all([
      razorpayRequest(`/orders/${encodeURIComponent(data.orderId)}`),
      razorpayRequest(`/payments/${encodeURIComponent(data.paymentId)}`),
    ]);
    if (order.id !== data.orderId || order.notes?.course_id !== data.courseId)
      throw new Error("Payment order does not match this course");
    if (order.amount !== course.price * 100 || order.currency !== "INR")
      throw new Error("Payment amount does not match the course price");
    if (
      payment.order_id !== data.orderId ||
      payment.amount !== course.price * 100 ||
      payment.currency !== "INR"
    )
      throw new Error("Payment details do not match the course");
    if (payment.status !== "captured")
      throw new Error(`Payment is not captured. Current status: ${payment.status}`);
    return { ok: true, paymentId: data.paymentId, orderId: data.orderId, amount: course.price };
  });

export const getUserPurchases = createServerFn({ method: "GET" }).handler(
  async () => [] as string[],
);

// Payments must go through real Razorpay checkout; faking signatures is not allowed.
export const simulateTestPayment = createServerFn({ method: "POST" })
  .validator((d) => z.object({ orderId: z.string().min(1).max(120) }).parse(d))
  .handler(
    async (): Promise<{
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }> => {
      throw new Error("Please complete the payment in the Razorpay checkout window.");
    },
  );
