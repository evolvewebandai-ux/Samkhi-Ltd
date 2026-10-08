import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { FygaroPaymentService } from "./backend/services/FygaroPaymentService";
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { NotificationService } from "./backend/services/NotificationService";
import sgMail from "@sendgrid/mail";

const appFirebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  // Let's seed the base Templates before booting
  await NotificationService.seedTemplates().catch(e => console.error("Error seeding notification templates:", e));

  const app = express();
  const PORT = 3000;

  // Express parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes (Declared FIRST, before Vite middleware) ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Samkhi Limited Hyper-Secure Payment Gateway", provider: "Fygaro" });
  });

  app.get("/api/shipping/rates", async (req, res) => {
    try {
      const activeFlag = req.query.active === "true";
      const ratesRef = collection(db, "shipping_rates");
      const ratesSnap = await getDocs(ratesRef);
      let rates = ratesSnap.docs.map(d => d.data());
      
      if (activeFlag) {
        rates = rates.filter(r => r.is_active === true);
      }
      
      rates.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      res.json(rates);
    } catch (err: any) {
      console.error("GET /api/shipping/rates error:", err);
      res.status(500).json({ error: "Failed to retrieve shipping rates" });
    }
  });

  app.get("/api/shipping/rate", async (req, res) => {
    try {
      const parishParam = (req.query.parish || "").toString().toLowerCase().trim();
      const subtotalParam = parseFloat(req.query.subtotal?.toString() || "0");
      
      if (!parishParam) {
        res.status(400).json({ error: "Parish query parameter is required" });
        return;
      }
      
      const ratesRef = collection(db, "shipping_rates");
      const ratesSnap = await getDocs(ratesRef);
      const rates = ratesSnap.docs.map(d => d.data());
      
      const matched = rates.find(r => 
        r.name.toLowerCase() === parishParam || 
        r.parish_code.toLowerCase() === parishParam ||
        r.id.toLowerCase() === `rate_${parishParam}`
      );
      
      if (!matched) {
        res.status(404).json({ error: `Shipping rate for parish '${parishParam}' not found` });
        return;
      }
      
      let finalRate = matched.rate || 0;
      let isFree = false;
      
      if (matched.free_shipping_threshold !== undefined && matched.free_shipping_threshold !== null) {
        if (subtotalParam >= matched.free_shipping_threshold) {
          finalRate = 0;
          isFree = true;
        }
      }
      
      res.json({
        rate: finalRate,
        free_shipping: isFree,
        estimated_days: matched.estimated_days || "1-2 business days",
        rateId: matched.id,
        parishName: matched.name
      });
    } catch (err: any) {
      console.error("GET /api/shipping/rate error:", err);
      res.status(500).json({ error: "Failed to calculate shipping rate" });
    }
  });

  app.get("/api/pickup/locations", async (req, res) => {
    try {
      const pickupRef = collection(db, "pickup_locations");
      const snap = await getDocs(pickupRef);
      const locations = snap.docs.map(d => d.data());
      const activeLocs = locations.filter(loc => loc.is_active === true);
      res.json(activeLocs);
    } catch (err: any) {
      console.error("GET /api/pickup/locations error:", err);
      res.status(500).json({ error: "Failed to retrieve pickup locations" });
    }
  });

  app.post("/api/checkout/create-order", async (req, res) => {
    try {
      const {
        cartItems,
        fulfillment_type,
        shipping_parish,
        pickup_location_id,
        shipping_address,
        customerName,
        customerEmail,
        customerPhone,
        notes
      } = req.body;

      if (!customerName || !customerEmail || !cartItems || cartItems.length === 0) {
        res.status(400).json({ error: "Missing required order parameters (customerName, customerEmail, cartItems)" });
        return;
      }

      if (fulfillment_type !== "shipping" && fulfillment_type !== "pickup") {
        res.status(400).json({ error: "Invalid fulfillment_type. Must be 'shipping' or 'pickup'" });
        return;
      }

      const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      let shipping_cost = 0;
      let shipping_rate_id = "";
      let matchedParishName = "";
      let matchedLocationName = "";
      
      if (fulfillment_type === "shipping") {
        if (!shipping_parish) {
          res.status(400).json({ error: "Shipping parish is required when fulfillment_type is 'shipping'" });
          return;
        }
        if (!shipping_address || !shipping_address.line1 || !shipping_address.phone) {
          res.status(400).json({ error: "Shipping address line1 and phone are required for deliveries" });
          return;
        }

        const ratesRef = collection(db, "shipping_rates");
        const ratesSnap = await getDocs(ratesRef);
        const rates = ratesSnap.docs.map(d => d.data());
        
        const matched = rates.find(r => 
          r.is_active === true && (
            r.name.toLowerCase() === shipping_parish.toLowerCase() ||
            r.parish_code.toLowerCase() === shipping_parish.toLowerCase() ||
            r.id.toLowerCase() === `rate_${shipping_parish.toLowerCase()}`
          )
        );

        if (!matched) {
          res.status(400).json({ error: `Selected parish '${shipping_parish}' is not an active delivery zone.` });
          return;
        }

        shipping_rate_id = matched.id;
        matchedParishName = matched.name;
        shipping_cost = matched.rate || 0;

        if (matched.free_shipping_threshold !== undefined && matched.free_shipping_threshold !== null) {
          if (subtotal >= matched.free_shipping_threshold) {
            shipping_cost = 0;
          }
        }
      } else {
        if (!pickup_location_id) {
          res.status(400).json({ error: "Pickup location ID is required for store pickup" });
          return;
        }

        const pickupRef = collection(db, "pickup_locations");
        const snap = await getDocs(pickupRef);
        const locations = snap.docs.map(d => d.data());
        const matchedLoc = locations.find(loc => loc.id === pickup_location_id && loc.is_active === true);
        
        if (!matchedLoc) {
          res.status(400).json({ error: "Selected pickup location is invalid or inactive." });
          return;
        }
        matchedLocationName = matchedLoc.name;
        shipping_cost = 0;
      }

      const taxes = subtotal * 0.15;
      const grand_total = subtotal + taxes + shipping_cost;
      
      const orderNum = Math.floor(10000 + Math.random() * 90000);
      const orderId = `#${orderNum}M`;
      
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timestampStr = new Date().toLocaleTimeString('en-US') + ' ' + dateStr;
      
      const newOrder = {
        id: orderId,
        customerName,
        customerEmail: customerEmail.toLowerCase().trim(),
        customerPhone: customerPhone || "",
        date: dateStr,
        subtotal,
        taxes,
        total: grand_total,
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        fulfillment_method: fulfillment_type === "shipping" ? "delivery" : "pickup",
        fulfillment_type,
        shipping_rate_id: shipping_rate_id || null,
        shipping_parish: matchedParishName || null,
        shipping_cost,
        shipping_total: shipping_cost,
        grand_total,
        parish: matchedParishName || null,
        shipping_address: fulfillment_type === 'shipping' ? {
          line1: shipping_address.line1,
          line2: shipping_address.line2 || "",
          parish: matchedParishName,
          phone: shipping_address.phone
        } : null,
        pickup_location_id: fulfillment_type === 'pickup' ? pickup_location_id : null,
        notes: notes || "",
        items: cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        lineItems: cartItems.map((item: any) => ({
          id: item.id,
          productId: item.originalProductId || item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          sku: item.sku || item.id.toUpperCase()
        })),
        createdAt: new Date().toISOString(),
        timeline: [
          {
            id: `tl_init_${Date.now()}`,
            type: "system",
            content: `🛒 Order created successfully via standard checkout. Fulfillment: **${fulfillment_type.toUpperCase()}** ${fulfillment_type === 'shipping' ? `to ${matchedParishName}` : `at ${matchedLocationName}`}.`,
            timestamp: timestampStr
          }
        ]
      };

      await setDoc(doc(db, "orders", orderId), newOrder);

      // Dispatch order confirmation email notification
      NotificationService.sendNotification("order_placed", newOrder.customerEmail, newOrder).catch(e => 
        console.error("Async error dispatching order_placed notification:", e)
      );

      res.json({ success: true, orderId });
    } catch (err: any) {
      console.error("POST /api/checkout/create-order error:", err);
      res.status(500).json({ error: err.message || "Failed to create order" });
    }
  });

  /**
   * Secure Checkout API Endpoint
   * Initiates payment checkouts and creates order drafts securely server side
   */
  app.post("/api/payments/fygaro/checkout", async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.customerEmail || !payload.cartItems || payload.cartItems.length === 0) {
        res.status(400).json({ error: "Missing required core parameters: customerEmail and cartItems are required" });
        return;
      }

      const result = await FygaroPaymentService.initializeCheckout(payload);
      res.json({
        success: true,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        paymentReference: result.paymentReference
      });
    } catch (error: any) {
      console.error("[Backend] Error initiating Fygaro payment session:", error);
      res.status(500).json({ error: error.message || "Failed to initialize Fygaro secure checkout session" });
    }
  });

  /**
   * Fygaro Transaction Callback Webhook Webhook Callback API
   * Triggers background order completion, stock deductions, and loyalty awards
   */
  app.post("/api/payments/fygaro/webhook", async (req, res) => {
    try {
      const { orderId, reference, amount, status, signature } = req.body;
      
      if (!orderId || !reference || amount === undefined || !status) {
        res.status(400).json({ error: "Invalid webhook payload parameters." });
        return;
      }

      console.log(`[Backend Webhook] Received payment verification hook for Order ${orderId}, total: ${amount}, status: ${status}`);

      const response = await FygaroPaymentService.verifyWebhook({
        orderId,
        reference,
        amount: parseFloat(amount),
        status,
        signature
      });

      if (!response.success) {
        res.status(400).json(response);
        return;
      }

      res.json(response);
    } catch (error: any) {
      console.error("[Backend Payload verification失败] Error inside secure payment hook callback handler:", error);
      res.status(500).json({ error: error.message || "Server error verifying transaction status" });
    }
  });

  /**
   * Admin-Only Manual Payments Reconciler Endpoint
   * Fully audited bypass for manually verifying payments directly from Fygaro Portal
   */
  app.post("/api/payments/fygaro/reconcile", async (req, res) => {
    try {
      const { orderId, officerName, reason } = req.body;
      if (!orderId || !officerName || !reason) {
        res.status(400).json({ error: "Credentials missing: orderId, officerName, and override reason are required" });
        return;
      }

      const result = await FygaroPaymentService.reconcileManual(orderId, officerName, reason);
      res.json(result);
    } catch (error: any) {
      console.error("[Backend Bypass] Manual reconciliator error:", error);
      res.status(500).json({ error: error.message || "Process reconciliation exception" });
    }
  });

  // --- Notification Manager API Routes ---
  app.post("/api/notifications/test-connection", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        res.status(400).json({ error: "SendGrid API Key is required." });
        return;
      }
      
      const response = await fetch("https://api.sendgrid.com/v3/scopes", {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        res.json({ message: "✓ Connected - Valid API Key" });
      } else {
        const err = await response.json().catch(() => ({}));
        res.status(401).json({ error: err.errors?.[0]?.message || "Invalid API Key or unauthorized contact." });
      }
    } catch (err: any) {
      console.error("Test connection exception:", err);
      res.status(500).json({ error: err.message || "Failed to contact SendGrid server." });
    }
  });

  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { event_trigger, to, data } = req.body;
      if (!event_trigger || !to) {
        res.status(400).json({ error: "Missing required fields: event_trigger and to email are required." });
        return;
      }
      await NotificationService.sendNotification(event_trigger, to, data || {});
      res.json({ success: true });
    } catch (err: any) {
      console.error("Async programmatic sendNotification error:", err);
      res.status(500).json({ error: err.message || "Failed to dispatch notification." });
    }
  });

  app.post("/api/notifications/test", async (req, res) => {
    try {
      const { template_id, to_email, subject, body_html, order_id } = req.body;
      if (!to_email) {
        res.status(400).json({ error: "To Email is required for test dispatch." });
        return;
      }

      // Prepare fallback sample order details
      let sampleData: Record<string, any> = {
        customer_name: "Nils J. Patterson",
        order_number: order_id || "#90281",
        fulfillment_type: "shipping",
        shipping_parish: "St. James",
        shipping_cost: 3500,
        subtotal: 385000,
        total: 388500,
        grand_total: 388500,
        shipping_address: "15 Sunset Blvd, Montego Bay",
        pickup_location_name: "Kingston Main Warehouse",
        pickup_location_address: "12 Constant Spring Road, Kingston 10",
        pickup_hours: "Mon - Fri, 8:00 AM - 5:00 PM",
        date: new Date().toLocaleDateString('en-US'),
        tracking_link: "https://samkhi.com/track/90281",
        cancellation_reason: "Customer requested cancellation with appropriate refund terms",
        product_name: "400W Monocrystalline Panel",
        available: 4,
        product_sku: "JAM-SLR-400W"
      };

      if (subject && body_html) {
        // Render from temporary editor inputs
        const settings = await NotificationService.getSettings();
        const fromName = settings.default_from_name || "Jamaica Solar Store";
        const fromEmail = settings.default_from_email || "noreply@samkhi.com";
        const replyTo = settings.reply_to_email || "support@samkhi.com";

        sampleData.lineItems = [
          { productName: "400W Monocrystalline Solar Panel", quantity: 6, price: 60000 },
          { productName: "3KW Off-Grid Hybrid Inverter", quantity: 1, price: 25000 }
        ];

        // Format totals
        const subtotalVal = sampleData.subtotal || 0;
        const shippingCostVal = sampleData.shipping_cost || 0;
        const grandTotalVal = sampleData.total || 0;

        sampleData.subtotal = `$${subtotalVal.toLocaleString()} JMD`;
        sampleData.shipping_cost = `$${shippingCostVal.toLocaleString()} JMD`;
        sampleData.grand_total = `$${grandTotalVal.toLocaleString()} JMD`;

        let itemsTable = `
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-family: sans-serif; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; background-color: #f8fafc;">
                <th style="padding: 10px; font-weight: 600; color: #334155;">Product</th>
                <th style="padding: 10px; font-weight: 600; color: #334155; text-align: center;">Qty</th>
                <th style="padding: 10px; font-weight: 600; color: #334155; text-align: right;">Price</th>
                <th style="padding: 10px; font-weight: 600; color: #334155; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;
        for (const item of sampleData.lineItems) {
          const itemTotal = item.price * item.quantity;
          itemsTable += `
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px; color: #2d3748;">${item.productName}</td>
              <td style="padding: 10px; color: #2d3748; text-align: center;">${item.quantity}</td>
              <td style="padding: 10px; color: #2d3748; text-align: right;">$${item.price.toLocaleString()} JMD</td>
              <td style="padding: 10px; color: #1a1a1a; text-align: right; font-weight: 600;">$${itemTotal.toLocaleString()} JMD</td>
            </tr>
          `;
        }
        itemsTable += `</tbody></table>`;
        sampleData.order_items_table = itemsTable;

        // Simple interpolations
        const interpolateMock = (text: string, data: any) => {
          let output = text;
          for (const [key, value] of Object.entries(data)) {
            const p = new RegExp(`{{${key}}}`, 'g');
            output = output.replace(p, value !== undefined && value !== null ? String(value) : '');
          }
          return output;
        };

        const compiledSubject = interpolateMock(subject, sampleData);
        const compiledBody = interpolateMock(body_html, sampleData);

        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
          throw new Error("SENDGRID_API_KEY environment variable is not configured on this container.");
        }
        sgMail.setApiKey(apiKey);

        const sgPayload: any = {
          to: to_email,
          from: { name: fromName, email: fromEmail },
          replyTo: replyTo,
          subject: compiledSubject,
          html: compiledBody,
          text: compiledBody.replace(/<[^>]*>/g, '')
        };

        if (settings.bcc_admin && settings.admin_email && to_email !== settings.admin_email) {
          sgPayload.bcc = settings.admin_email;
        }

        await sgMail.send(sgPayload);
        res.json({ success: true, message: "🟢 Live updated test email dispatched successfully!" });
      } else if (template_id) {
        sampleData.lineItems = [
          { productName: "400W Monocrystalline Solar Panel", quantity: 6, price: 60000 },
          { productName: "3KW Off-Grid Hybrid Inverter", quantity: 1, price: 25000 }
        ];
        await NotificationService.sendNotification(template_id, to_email, sampleData);
        res.json({ success: true, message: "🟢 Pre-saved test email dispatched successfully!" });
      } else {
         res.status(400).json({ error: "Missing required fields. Provide template_id or custom subject and html." });
      }
    } catch (err: any) {
      console.error("Test email dispatch service error:", err);
      res.status(500).json({ error: err.message || "Failed to dispatch test notification email." });
    }
  });

  // --- Development vs Production Asset Serving ---
  if (process.env.NODE_ENV !== "production") {
    // Vite integration for transparent TypeScript hot development in development container
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files compiled in "dist"
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 (ingress routing demands precisely port 3000)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-Stack Node Server Ready] App operational on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[Server Crash] Failsafe shutdown:", error);
});
