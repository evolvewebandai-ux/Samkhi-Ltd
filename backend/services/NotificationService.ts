import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  collection, 
  getDocs,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import sgMail from '@sendgrid/mail';

const appFirebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  event_trigger: string;
  channel: 'email';
  is_active: boolean;
  subject: string;
  preheader?: string;
  body_html: string;
  body_text: string;
  sendgrid_template_id?: string;
  variables: string[];
  updated_at?: any;
  updated_by?: string;
}

export interface NotificationLog {
  id?: string;
  template_id: string;
  event_trigger: string;
  to_email: string;
  order_id?: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sendgrid_message_id?: string;
  error?: string;
  sent_at: any;
}

export class NotificationService {
  private static getSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY environment variable is not configured on this server container.");
    }
    sgMail.setApiKey(apiKey);
    return sgMail;
  }

  /**
   * Retrieves active notification settings.
   * Uses fallback values if the firestore document does not exist.
   */
  static async getSettings() {
    try {
      const snap = await getDoc(doc(db, 'settings', 'notifications'));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn("Failed fetching notification settings from firestore, using defaults:", e);
    }
    return {
      default_from_name: "Jamaica Solar Store",
      default_from_email: "noreply@samkhi.com",
      reply_to_email: "support@samkhi.com",
      bcc_admin: true,
      admin_email: "admin@samkhi.com"
    };
  }

  /**
   * Saves notification settings to Firestore
   */
  static async saveSettings(settings: any) {
    await setDoc(doc(db, 'settings', 'notifications'), {
      ...settings,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Seeds default email templates if collection is empty
   */
  static async seedTemplates() {
    try {
      const colRef = collection(db, 'notification_templates');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        console.log("[Notification Seeder] Templates already seeded. Skipping.");
        return;
      }

      console.log("[Notification Seeder] Initializing base 13 templates seeding...");
      const defaultTemplates = NotificationService.getDefaultTemplateSeeds();
      
      for (const t of defaultTemplates) {
        await setDoc(doc(db, 'notification_templates', t.id), {
          ...t,
          updated_at: new Date().toISOString(),
          updated_by: "System Initial Seeder"
        });
      }
      console.log(`[Notification Seeder] Successfully seeded ${defaultTemplates.length} templates.`);
    } catch (err) {
      console.error("[Notification Seeder] Error seeding default templates:", err);
    }
  }

  /**
   * Sends a transactional email notification based on trigger and user details
   */
  static async sendNotification(
    event_trigger: string,
    to: string,
    data: Record<string, any>
  ): Promise<void> {
    const logsRef = collection(db, 'notification_logs');
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    try {
      // 1. Fetch template from DB
      const templatesSnap = await getDocs(collection(db, 'notification_templates'));
      const templates = templatesSnap.docs.map(doc => doc.data() as NotificationTemplate);
      const template = templates.find(t => t.event_trigger === event_trigger && t.is_active);

      if (!template) {
        console.warn(`[Notification] No active template found for trigger: ${event_trigger}. Skipping.`);
        return;
      }

      // 2. Fetch system configurations
      const settings = await NotificationService.getSettings();
      const fromName = settings.default_from_name || "Jamaica Solar Store";
      const fromEmail = settings.default_from_email || "noreply@samkhi.com";
      const replyTo = settings.reply_to_email || "support@samkhi.com";

      // 3. Compile variables (copy to avoid mutating source payload)
      const compiledVars = { ...data };
      compiledVars.customer_name = compiledVars.customer_name || compiledVars.customerName || "Customer";
      compiledVars.order_number = compiledVars.order_number || compiledVars.id || compiledVars.orderId || "";
      
      // Compute fulfillment summaries
      const subtotalVal = compiledVars.subtotal || 0;
      const shippingCostVal = compiledVars.shipping_cost || compiledVars.shippingCost || 0;
      const grandTotalVal = compiledVars.total || compiledVars.grand_total || compiledVars.grandTotal || 0;

      compiledVars.subtotal = `$${subtotalVal.toLocaleString()} JMD`;
      compiledVars.shipping_cost = `$${shippingCostVal.toLocaleString()} JMD`;
      compiledVars.grand_total = `$${grandTotalVal.toLocaleString()} JMD`;
      compiledVars.order_date = compiledVars.order_date || compiledVars.date || new Date().toLocaleDateString('en-US');

      const fulfillmentType = compiledVars.fulfillment_type || compiledVars.fulfillment_method || "shipping";
      compiledVars.fulfillment_type = fulfillmentType === 'pickup' ? "Store Pickup" : "Courier delivery";

      // Construct dynamic items table
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

      const lineItems = compiledVars.lineItems || compiledVars.cartItems || [];
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        for (const item of lineItems) {
          const qty = item.quantity || 1;
          const price = item.price || 0;
          const total = price * qty;
          itemsTable += `
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px; color: #2d3748;">${item.productName || item.name || 'Solar item'}</td>
              <td style="padding: 10px; color: #2d3748; text-align: center;">${qty}</td>
              <td style="padding: 10px; color: #2d3748; text-align: right;">$${price.toLocaleString()} JMD</td>
              <td style="padding: 10px; color: #1a1a1a; text-align: right; font-weight: 600;">$${total.toLocaleString()} JMD</td>
            </tr>
          `;
        }
      } else {
        itemsTable += `
          <tr>
            <td colspan="4" style="padding: 15px; text-align: center; color: #64748b;">No details recorded for items</td>
          </tr>
        `;
      }
      itemsTable += `</tbody></table>`;
      compiledVars.order_items_table = itemsTable;

      // Compile subject & formats
      const subject = NotificationService.interpolate(template.subject, compiledVars);
      const preheader = template.preheader ? NotificationService.interpolate(template.preheader, compiledVars) : "";
      const body_html = NotificationService.interpolate(template.body_html, compiledVars);
      const body_text = NotificationService.interpolate(template.body_text || "", compiledVars) || body_html.replace(/<[^>]*>/g, '');

      // Build SendGrid Payload
      const sgPayload: any = {
        to: to,
        from: { name: fromName, email: fromEmail },
        replyTo: replyTo,
        subject: subject,
        html: body_html,
        text: body_text
      };

      if (settings.bcc_admin && settings.admin_email && to !== settings.admin_email) {
        sgPayload.bcc = settings.admin_email;
      }

      // Initialize client lazily and send via SendGrid
      const sg = NotificationService.getSendGrid();
      const response = await sg.send(sgPayload);
      const msgId = response[0]?.headers['x-message-id'] || `sg_${Date.now()}`;

      // Create Success Log
      await setDoc(doc(logsRef, logId), {
        id: logId,
        template_id: template.id,
        event_trigger,
        to_email: to,
        order_id: compiledVars.order_number || null,
        status: 'sent',
        sendgrid_message_id: msgId,
        sent_at: new Date().toISOString()
      });

      console.log(`[Notification Service] Successfully dispatched email [${event_trigger}] to ${to} (${msgId})`);
    } catch (err: any) {
      console.error(`[Notification Service Error] Event trigger: ${event_trigger} failed to deliver:`, err);
      // Log Failure
      await setDoc(doc(logsRef, logId), {
        id: logId,
        template_id: event_trigger,
        event_trigger,
        to_email: to,
        order_id: data.order_number || data.id || data.orderId || null,
        status: 'failed',
        error: err.message || JSON.stringify(err),
        sent_at: new Date().toISOString()
      }).catch(dbErr => console.error("Failsafe warning: logging notification failure collapsed:", dbErr));

      throw err;
    }
  }

  private static interpolate(text: string, data: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value !== undefined && value !== null ? String(value) : '');
    }
    return result;
  }

  private static getDefaultTemplateSeeds(): NotificationTemplate[] {
    const layoutHeader = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background-color: #0f172a; padding: 32px 24px; text-align: center; }
          .header h1 { color: #f8fafc; font-size: 22px; font-weight: 700; margin: 0; tracking: -0.025em; letter-spacing: -0.5px; }
          .content { padding: 32px 24px; line-height: 1.6; }
          .footer { background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .card { background-color: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 9999px; }
          .badge-shipping { background-color: #dbeafe; color: #1e40af; }
          .badge-pickup { background-color: #fef3c7; color: #92400e; }
          .highlight { font-weight: 600; color: #0f172a; }
          .button { display: inline-block; background-color: #020617; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JAMAICA SOLAR STORE</h1>
          </div>
          <div class="content">
    `;

    const layoutFooter = `
          </div>
          <div class="footer">
            <p>&copy; 2026 Jamaica Solar Store &bull; Samkhi Limited</p>
            <p>12 Constant Spring Road, Kingston 10, Jamaica</p>
            <p style="margin-top: 10px; font-size: 10px; color: #94a3b8;">This email is a secure transactional dispatch. If you have questions, reach us at support@samkhi.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return [
      {
        id: "order_placed",
        name: "Order Placed",
        description: "Sent immediately after checkout confirmation",
        event_trigger: "order_placed",
        channel: "email",
        is_active: true,
        subject: "Order #{{order_number}} confirmed - Jamaica Solar Store",
        preheader: "Your sustainable energy order is confirmed and compiled.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Order Confirmed!</h2>
          <p>Hi {{customer_name}},</p>
          <p>Thank you for shopping with us! Your order <span class="highlight">#{{order_number}}</span> has been safely received and is now being compiled details by our logistics team.</p>
          
          <div class="card">
            <p style="margin: 0; font-weight: 600;">Fulfillment: {{fulfillment_type}}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
              Parish: {{shipping_parish}} <br>
              Delivery/Pickup Rate: {{shipping_cost}}
            </p>
          </div>

          <p style="margin-bottom: 5px; font-weight: 600; color: #0f172a;">ITEMS IN THIS DISPATCH:</p>
          {{order_items_table}}

          <div style="border-top: 1px solid #edf2f7; padding-top: 15px; margin-top: 15px; text-align: right;">
            <p style="margin: 0; color: #64748b;">Subtotal: <span class="highlight">{{subtotal}}</span></p>
            <p style="margin: 4px 0; color: #64748b;">Fulfillment: <span class="highlight">{{shipping_cost}}</span></p>
            <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">Grand Total: {{grand_total}}</p>
          </div>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Thank you for your order #{{order_number}} at Jamaica Solar Store. Your order grand total is {{grand_total}}.",
        variables: ["order_number", "customer_name", "grand_total", "fulfillment_type", "shipping_parish", "shipping_cost", "subtotal", "order_items_table"]
      },
      {
        id: "payment_confirmed",
        name: "Payment Confirmed",
        description: "Sent once payment has been securely verified",
        event_trigger: "payment_confirmed",
        channel: "email",
        is_active: true,
        subject: "Payment confirmed for Order #{{order_number}}",
        preheader: "Secure callback payment successfully completed.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Payment Verified Successfully</h2>
          <p>Hi {{customer_name}},</p>
          <p>Good news! Our settlement engine has verified the payment of <span class="highlight">{{grand_total}}</span> for your order <span class="highlight">#{{order_number}}</span>.</p>
          <p>Your items have been allocated and are queued up on the active picking shelf.</p>
          
          <div class="card">
            <p style="margin: 0; font-size: 13px;"><span class="highlight">Fulfillment Method</span>: {{fulfillment_type}}</p>
            <p style="margin: 5px 0 0 0; font-size: 13px;"><span class="highlight">Total Settled</span>: {{grand_total}} (Visa/Stripe/Fygaro)</p>
          </div>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Payment for Order #{{order_number}} of {{grand_total}} has been fully confirmed.",
        variables: ["order_number", "customer_name", "grand_total", "fulfillment_type"]
      },
      {
        id: "order_picked",
        name: "Order Prepared (Picked)",
        description: "Dispatched when products are gathered from warehouse shelves",
        event_trigger: "order_picked",
        channel: "email",
        is_active: true,
        subject: "Your order #{{order_number}} is being prepared",
        preheader: "Gathering solar arrays off inventory shelves.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">We are picking your items!</h2>
          <p>Hi {{customer_name}},</p>
          <p>Your order <span class="highlight">#{{order_number}}</span> is in preparation. Our warehouse staff has printed the picking slip and is pulling your items from the shelves.</p>
          <p>We'll notify you as soon as they are fully boxed and ready.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Order #{{order_number}} is being pulled and compiled at the local Kingston warehouse.",
        variables: ["order_number", "customer_name"]
      },
      {
        id: "order_packed",
        name: "Order Packed",
        description: "Dispatched when items are securely packaged and boxed",
        event_trigger: "order_packed",
        channel: "email",
        is_active: true,
        subject: "Order #{{order_number}} packed",
        preheader: "Your order is boxed and ready for handover.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Packed and Sealed!</h2>
          <p>Hi {{customer_name}},</p>
          <p>Awesome! Your solar kit for order <span class="highlight">#{{order_number}}</span> has been safely packed with appropriate padding and heat sealing.</p>
          <p>It's currently at the staging bay awaiting courier transit or pickup handover.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Order #{{order_number}} has been securely packed.",
        variables: ["order_number", "customer_name"]
      },
      {
        id: "ready_for_pickup",
        name: "Ready for Pickup",
        description: "Sent when order is processed and awaits storefront pick",
        event_trigger: "ready_for_pickup",
        channel: "email",
        is_active: true,
        subject: "Your order is ready for pickup - Order #{{order_number}}",
        preheader: "Handover ready inside our store.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #020617;">Ready for Storefront Pickup!</h2>
          <p>Hi {{customer_name}},</p>
          <p>Your order <span class="highlight">#{{order_number}}</span> is packaged and ready at the store location.</p>
          
          <div class="card" style="border-left: 4px solid #fec001;">
            <p style="margin: 0 0 5px 0; font-weight: 700; color: #000;">PICKUP INFO</p>
            <p style="margin: 0; font-size: 14px;">
              <strong>Store</strong>: {{pickup_location_name}}<br>
              <strong>Address</strong>: {{pickup_location_address}}<br>
              <strong>Hours</strong>: {{pickup_hours}}
            </p>
          </div>

          <p>Please bring a valid Government ID and quote order number <span class="highlight">#{{order_number}}</span> to our clerk upon arrival.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Order #{{order_number}} is ready for pickup at {{pickup_location_name}}, {{pickup_location_address}}. Hours: {{pickup_hours}}.",
        variables: ["order_number", "customer_name", "pickup_location_name", "pickup_location_address", "pickup_hours"]
      },
      {
        id: "ready_for_delivery",
        name: "Out for Delivery",
        description: "Sent when order is loaded onto the courier vehicle",
        event_trigger: "ready_for_delivery",
        channel: "email",
        is_active: true,
        subject: "Your order is out for delivery - Order #{{order_number}}",
        preheader: "Fast courier is on the road.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Out for Courier Delivery!</h2>
          <p>Hi {{customer_name}},</p>
          <p>Your order <span class="highlight">#{{order_number}}</span> is on its way. The driver has loaded your solar elements into the delivery vehicle and is heading out.</p>

          <div class="card">
            <h4 style="margin: 0 0 5px 0; color: #0f172a;">Shipping Details</h4>
            <p style="margin: 0; font-size: 13px;">
              <strong>Destination</strong>: {{shipping_address}}<br>
              <strong>Parish Bounds</strong>: {{shipping_parish}}<br>
              <strong>Tracking/Receipt Number</strong>: TRACK-{{order_number}}
            </p>
          </div>

          <p>If you need custom logistics directions, please coordinate with our delivery driver.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Your order #{{order_number}} is out for delivery to {{shipping_address}}, {{shipping_parish}}.",
        variables: ["order_number", "customer_name", "shipping_address", "shipping_parish", "tracking_link"]
      },
      {
        id: "order_completed",
        name: "Order Completed",
        description: "Dispatched upon safe handover or package dropoff",
        event_trigger: "order_completed",
        channel: "email",
        is_active: true,
        subject: "Thank you! Order #{{order_number}} completed",
        preheader: "Successfully fulfilled. Share your solar feedback.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #16a34a;">Fulfillment Confirmed</h2>
          <p>Hi {{customer_name}},</p>
          <p>Thank you for choosing Jamaica Solar Store! Order <span class="highlight">#{{order_number}}</span> is officially marked as Completed and fully fulfilled.</p>
          <p>Congratulations on taking a step towards grid-independent sustainable energy. We value your feedback on your clean power journey.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Order #{{order_number}} is completed. Thank you for shopping with us!",
        variables: ["order_number", "customer_name"]
      },
      {
        id: "order_cancelled",
        name: "Order Cancelled",
        description: "Sent if an order is cancelled or aborted by staff/user",
        event_trigger: "order_cancelled",
        channel: "email",
        is_active: true,
        subject: "Order #{{order_number}} cancelled",
        preheader: "Notification regarding your canceled solar order.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #dc2626;">Order Cancelled</h2>
          <p>Hi {{customer_name}},</p>
          <p>We would like to inform you that order <span class="highlight">#{{order_number}}</span> has been cancelled.</p>
          
          <div class="card" style="border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-size: 14px;"><strong>Reason for Cancellation</strong>: {{cancellation_reason}}</p>
          </div>

          <p>If payment was already securely transferred, standard reversal terms will initiate automatically on our settlement gateway.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Order #{{order_number}} was cancelled due to: {{cancellation_reason}}.",
        variables: ["order_number", "customer_name", "cancellation_reason"]
      },
      {
        id: "shipping_update",
        name: "Shipping Update",
        description: "Dispatched if tracking or parcel speed adjustments occur",
        event_trigger: "shipping_update",
        channel: "email",
        is_active: true,
        subject: "Shipping update for Order #{{order_number}}",
        preheader: "Tracking update regarding your shipment.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Shipment Status Updated</h2>
          <p>Hi {{customer_name}},</p>
          <p>This is a shipping update regarding your current order <span class="highlight">#{{order_number}}</span>.</p>
          <p>Our courier dispatch log shows updates to your tracking timeline. If there are custom delays due to parish weather, our courier will make direct contact.</p>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Your shipping status has been updated for Order #{{order_number}}.",
        variables: ["order_number", "customer_name"]
      },
      {
        id: "abandoned_cart",
        name: "Abandoned Cart Reminder",
        description: "Remind customers of leftover solar elements in their active cart",
        event_trigger: "abandoned_cart",
        channel: "email",
        is_active: true,
        subject: "Forgot something? Your solar cart is waiting",
        preheader: "Your sustainable options are still saved safely.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">We kept your cart safe!</h2>
          <p>Hi {{customer_name}},</p>
          <p>We noticed you left some energy equipment inside your digital cart. Sustainable solar equipment goes fast, and we wanted to make sure they didn't expire before you locking in your rates.</p>
          <p>Click below to load your custom cart and check out instantly:</p>
          <center>
            <a href="https://samkhi.com/cart" class="button">Resume My Checkout</a>
          </center>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, We noticed you left some items in your cart. Head back to complete your checkout!",
        variables: ["customer_name"]
      },
      {
        id: "welcome_email",
        name: "Welcome Email",
        description: "Dispatched when brand new accounts are approved/registered",
        event_trigger: "welcome_email",
        channel: "email",
        is_active: true,
        subject: "Welcome to Jamaica Solar Store",
        preheader: "Join the clean energy revolution today.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #0f172a;">Welcome to the Solar Revolution!</h2>
          <p>Hi {{customer_name}},</p>
          <p>We're thrilled to have you at Jamaica Solar Store! You've joined a community of local leaders and homeowners committed to reducing electricity costs through modular grid energy.</p>
          <p>Sign in to your dashboard to unlock custom loyalty multipliers, catalog watchlists, and address files.</p>
          <center>
            <a href="https://samkhi.com/login" class="button">Access My Account</a>
          </center>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Welcome to Jamaica Solar Store! We are thrilled to welcome you.",
        variables: ["customer_name"]
      },
      {
        id: "password_reset",
        name: "Password Reset Request",
        description: "Provides credentials reset URL links securely",
        event_trigger: "password_reset",
        channel: "email",
        is_active: true,
        subject: "Reset your password",
        preheader: "Secure verification link inside.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #020617;">Credentials Reset Requested</h2>
          <p>Hi {{customer_name}},</p>
          <p>We received a secure request to reset your password. If you didn't trigger this action, you can safely ignore this mail.</p>
          <p>To establish a new login password, click the verification button below:</p>
          <center>
            <a href="https://samkhi.com/reset-password?token=secure_simulation_token" class="button">Setup New Password</a>
          </center>
        ${layoutFooter}`,
        body_text: "Hi {{customer_name}}, Reset your password by accessing this link: https://samkhi.com/reset-password",
        variables: ["customer_name"]
      },
      {
        id: "low_stock_alert_admin",
        name: "Low Stock Alert (Admin Only)",
        description: "Alerts catalog admins of warehouse reserves falling below low stock threshold",
        event_trigger: "low_stock_alert_admin",
        channel: "email",
        is_active: true,
        subject: "Low stock alert: {{product_name}} - {{available}} left",
        preheader: "Immediate inventory action required.",
        body_html: `${layoutHeader}
          <h2 style="margin-top: 0; color: #b45309;">⚠️ Inventory Re-order Alert</h2>
          <p>Notification for Jamaica Solar Store Administrators,</p>
          <p>This is a system-generated stock take warning. Reservoir stock counts for item <span class="highlight">{{product_name}}</span> have fallen below threshold limit states.</p>
          
          <div class="card" style="border-left: 4px solid #b45309;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Product</strong>: {{product_name}}<br>
              <strong>Units Remaining</strong>: <span style="color:#b45309; font-weight:700;">{{available}} items</span><br>
              <strong>SKU ID</strong>: {{product_sku}}
            </p>
          </div>

          <p>Please launch the E-Commerce Warehouse Portal to dispatch an acquisitions Purchase Order (PO) immediately.</p>
        ${layoutFooter}`,
        body_text: "System Alert: Stock counts for {{product_name}} are down to {{available}} pieces left.",
        variables: ["product_name", "available", "product_sku"]
      }
    ];
  }
}
