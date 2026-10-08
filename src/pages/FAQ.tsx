import { motion } from 'motion/react';
import { Plus, Minus, HelpCircle, Phone, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    topic: "Solar Energy",
    items: [
      {
        question: "How much can I actually save on my JPS bill?",
        answer: "Most of our customers see a reduction of 70% to 90% on their monthly electricity bills. The exact amount depends on the size of your system and your energy consumption habits. Many systems pay for themselves within 3 to 5 years."
      },
      {
        question: "Do solar panels work during a power cut?",
        answer: "Standard grid-tied systems will shut down during a power cut for safety. However, if you choose a hybrid or off-grid system with battery storage, you will have continuous power even when the grid is down."
      },
      {
        question: "How long do solar panels last?",
        answer: "Our high-quality JA Solar and HT Solar panels come with a 25-year linear power output warranty. The physical life of the panels often exceeds 30 years with minimal maintenance."
      }
    ]
  },
  {
    topic: "Products & Orders",
    items: [
      {
        question: "Do you offer islandwide delivery?",
        answer: "Yes, we offer delivery across all 14 parishes in Jamaica. Delivery times typically range from 24 to 72 hours depending on your location."
      },
      {
        question: "Can I collect my order in person?",
        answer: "Absolutely. You can choose to collect your order from our Ocho Rios Showroom or our Drax Hall Branch. Please wait for an 'Order Ready' notification before heading over."
      }
    ]
  },
  {
    topic: "Service & Installation",
    items: [
      {
        question: "Does Samkhi provide installation services?",
        answer: "Yes, we have a team of certified energy engineers who handle residential and commercial installations. We also offer design consultations to ensure you get the most efficient system for your needs."
      },
      {
        question: "What maintenance is required for solar systems?",
        answer: "Solar systems are very low maintenance. We recommend cleaning the panels twice a year to remove dust and checking the inverter connections annually. We offer maintenance packages for all our installations."
      }
    ]
  }
];

export default function FAQ() {
  const [activeTopic, setActiveTopic] = useState(FAQS[0].topic);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="pt-32 pb-20 bg-secondary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/5 -skew-x-12 translate-x-32" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
              <HelpCircle size={14} />
              Support Center
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tight">
              Common <span className="text-cta italic">Questions</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Everything you need to know about switching to solar and our energy-efficient products.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Categories Sidebar */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-4">Topics</p>
            {FAQS.map((topicItem) => (
              <button
                key={topicItem.topic}
                onClick={() => {
                  setActiveTopic(topicItem.topic);
                  setOpenIndex(null);
                }}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all ${
                  activeTopic === topicItem.topic 
                    ? "bg-secondary text-white shadow-xl shadow-secondary/20" 
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {topicItem.topic}
              </button>
            ))}
            
            <div className="mt-12 p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
              <h4 className="font-display font-black text-emerald-900 mb-4">Still need help?</h4>
              <p className="text-emerald-700/70 text-sm mb-6 leading-relaxed">
                Connect with our expert consultants for personalized advice.
              </p>
              <div className="space-y-3">
                <a href="tel:18766303350" className="flex items-center gap-3 text-emerald-600 font-bold text-sm hover:underline">
                  <Phone size={16} /> (876) 630-3350
                </a>
                <a href="mailto:support@samkhi.com" className="flex items-center gap-3 text-emerald-600 font-bold text-sm hover:underline">
                  <Mail size={16} /> Contact Support
                </a>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-3 space-y-4">
            {FAQS.find(c => c.topic === activeTopic)?.items.map((faq, idx) => (
              <div 
                key={idx}
                className={`border rounded-[2rem] transition-all duration-500 overflow-hidden ${
                  openIndex === idx ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-white"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left"
                >
                  <span className="text-xl font-bold text-secondary pr-8">{faq.question}</span>
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    openIndex === idx ? "bg-emerald-500 text-white rotate-180" : "bg-slate-50 text-slate-400"
                  }`}>
                    {openIndex === idx ? <Minus size={20} /> : <Plus size={20} />}
                  </div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openIndex === idx ? "auto" : 0, opacity: openIndex === idx ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 text-slate-600 leading-relaxed max-w-3xl">
                    {faq.answer}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-emerald-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8 relative z-10">
              Ready to Save <br /> <span className="italic text-cta">Real Money?</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link to="/solar#quote" className="btn-secondary px-10 py-5 rounded-2xl text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
                Request Free Quote
                <MessageSquare size={20} />
              </Link>
              <Link to="/solar" className="bg-white/10 text-white backdrop-blur-md px-10 py-5 rounded-2xl text-lg font-black uppercase tracking-widest hover:bg-white/20 transition-all inline-flex items-center justify-center">
                Solar Solutions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
