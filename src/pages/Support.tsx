import { motion } from 'motion/react';
import { ShieldCheck, Truck, RotateCcw, FileText, Lock } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const CONTENT_MAP: Record<string, { title: string; icon: any; content: string[] }> = {
  '/warranty': {
    title: 'Warranty Information',
    icon: ShieldCheck,
    content: [
      "Samkhi Limited provides industry-leading warranties on all energy products.",
      "Solar Panels: 10-year manufacturing warranty, 25-year linear power output warranty.",
      "Inverters: 5-year standard warranty on Deye and SRNE hybrid models.",
      "Batteries: 10-year warranty (or 6000 cycles) on Lithium LiFePO4 batteries.",
      "LED Lighting: 1 to 3 year limited warranty depending on the model.",
      "Professional installation by Samkhi ensures your manufacturer warranties remain valid."
    ]
  },
  '/delivery': {
    title: 'Delivery & Pickup',
    icon: Truck,
    content: [
      "We offer reliable islandwide delivery across Jamaica.",
      "Ocho Rios & St. Ann: Next-day delivery for in-stock items.",
      "Kingston & St. Catherine: 24-48 hour delivery window.",
      "Western & Eastern Parishes: 48-72 hour delivery service.",
      "Free pickup is available from our Ocho Rios Showroom and Drax Hall Branch during business hours.",
      "Heavy items like solar panels and batteries require specialized transport which we coordinate."
    ]
  },
  '/returns': {
    title: 'Returns & Exchanges',
    icon: RotateCcw,
    content: [
      "Your satisfaction is our priority. Products can be returned within 7 days of purchase.",
      "Items must be in original packaging, unused, and in resalable condition.",
      "Electronic components (inverters/batteries) that have been installed cannot be returned unless verified as defective by our technicians.",
      "Proof of purchase is required for all returns and warranty claims.",
      "Refunds are processed within 3-5 business days to the original payment method."
    ]
  },
  '/privacy': {
    title: 'Privacy Policy',
    icon: Lock,
    content: [
      "Samkhi Limited respects your privacy and protects your personal information.",
      "We collect data only to process orders and provide professional energy advice.",
      "Your banking information is never stored on our servers; payments are processed securely via encrypted gateways.",
      "We do not share your contact details with third-party marketers.",
      "You have the right to request access to or deletion of your personal data at any time."
    ]
  },
  '/terms': {
    title: 'Terms of Service',
    icon: FileText,
    content: [
      "By using this website and our services, you agree to comply with these terms.",
      "Pricing for solar installations is subject to site assessments and final design approval.",
      "Samkhi Limited is not liable for energy savings fluctuations caused by external weather conditions.",
      "All intellectual property, including designs and logos, belongs to Samkhi Limited.",
      "Installation timelines are estimates and can be affected by weather or grid-utility approvals."
    ]
  }
};

export default function Support() {
  const { pathname } = useLocation();
  const pageData = CONTENT_MAP[pathname] || CONTENT_MAP['/terms'];
  const Icon = pageData.icon;

  return (
    <div className="bg-slate-50 min-h-screen pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-[3rem] p-8 md:p-16 shadow-enterprise border border-slate-100"
        >
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600">
              <Icon size={40} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Information Center</p>
              <h1 className="text-4xl md:text-5xl font-display font-black text-secondary tracking-tight">
                {pageData.title}
              </h1>
            </div>
          </div>

          <div className="space-y-12">
             {pageData.content.map((paragraph, idx) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: idx * 0.1 }}
                 className="flex gap-6 group"
               >
                 <span className="text-cta font-black text-xl italic opacity-30 mt-1">0{idx + 1}</span>
                 <p className="text-slate-600 text-lg leading-relaxed font-medium group-hover:text-secondary transition-colors">
                   {paragraph}
                 </p>
               </motion.div>
             ))}
          </div>

          <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <p className="font-bold text-secondary mb-1">Have more specific questions?</p>
              <p className="text-slate-400 text-sm">Our support team is available 6 days a week.</p>
            </div>
            <div className="flex gap-4">
              <a href="/contact" className="btn-secondary px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest">
                Contact Us
              </a>
              <a href="tel:18766303350" className="btn-cta px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest">
                Call Now
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
