import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setTimeout(() => setStatus('success'), 1500);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Header */}
      <section className="bg-secondary pt-32 pb-20 text-white relative overflow-hidden grid-bg">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 translate-x-32" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-cta font-black text-sm uppercase tracking-[0.4em] mb-4 block">Get In Touch</span>
            <h1 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tight">Contact Our Experts</h1>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">
              Ready to start your energy revolution? Visit our showrooms in Ocho Rios or Drax Hall, St. Ann.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 -mt-10 relative z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Contact Info Cards */}
            <div className="space-y-10">
              {/* Ocho Rios Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Ocho Rios</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <ContactCard 
                  icon={MapPin} 
                  title="Showroom Location" 
                  info="Shop C1, New Pineapple Shopping Centre"
                  subInfo="Main Street, Ocho Rios, St. Ann"
                />
                <ContactCard 
                  icon={Phone} 
                  title="Direct Contact" 
                  info="(876) 630-3350"
                  subInfo="(876) 972-1952"
                  href="tel:18766303350"
                />
              </div>

              {/* Drax Hall Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Drax Hall</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <ContactCard 
                  icon={MapPin} 
                  title="Warehouse & Distribution" 
                  info="Unit 8, 14 Drax Business Center"
                  subInfo="Drax Hall, St. Ann"
                />
                <ContactCard 
                  icon={Phone} 
                  title="Direct Contact" 
                  info="(876) 630-3231"
                  subInfo="samkhi.draxhall@gmail.com"
                  href="tel:18766303231"
                />
              </div>

              {/* General Support Group */}
              <div className="space-y-4 pt-4">
                <ContactCard 
                  icon={Mail} 
                  title="Email Support" 
                  info="samkhi.ochorios@gmail.com"
                  subInfo="orders.samkhi@gmail.com"
                  href="mailto:samkhi.ochorios@gmail.com"
                />
                <ContactCard 
                  icon={Clock} 
                  title="Business Hours" 
                  info="8:30 AM - 5:00 PM (M-F)"
                  subInfo="Saturday: 9:00 AM - 3:00 PM"
                />
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-[2.5rem] shadow-enterprise p-8 md:p-16 border border-slate-100">
                <h2 className="text-4xl font-display font-black text-secondary mb-10 tracking-tight">Send Us a Message</h2>
                
                {status === 'success' ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 md:py-20"
                  >
                    <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-200/50 transform -rotate-3">
                      <CheckCircle2 size={48} className="stroke-[2.5]" />
                    </div>
                    <h3 className="text-3xl font-display font-black text-secondary mb-4 leading-tight">Message Sent!</h3>
                    <p className="text-slate-500 mb-10 max-w-sm mx-auto text-lg leading-relaxed">
                      Thank you for contacting Samkhi Ltd. One of our representatives will contact you shortly.
                    </p>
                    <button 
                      onClick={() => setStatus('idle')}
                      className="px-12 py-4 bg-secondary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary transition-all shadow-lg active:scale-95"
                    >
                      Send New Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Full Name</label>
                        <input 
                          type="text" 
                          placeholder="What should we call you?"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Email Address</label>
                        <input 
                          type="email" 
                          placeholder="Your professional email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Phone Number</label>
                        <input 
                          type="tel" 
                          placeholder="+1 (876) ..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Subject</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium appearance-none cursor-pointer"
                            required
                          >
                            <option>General Inquiry</option>
                            <option>LED Lighting Project</option>
                            <option>Residential Solar Quote</option>
                            <option>Commercial Energy Solutions</option>
                            <option>Technical Support</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Your Message</label>
                      <textarea 
                        rows={6}
                        placeholder="Tell us about your project or energy needs..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium resize-none placeholder:text-slate-400"
                        required
                      ></textarea>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={status === 'submitting'}
                        className="btn-primary w-full md:w-auto px-16 py-5 text-xl font-black uppercase tracking-[0.2em] group"
                      >
                        {status === 'submitting' ? (
                          <div className="flex items-center gap-4">
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            Send Message <Send size={24} className="group-hover:translate-x-2 transition-transform stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-slate-200 h-[500px] rounded-[3rem] overflow-hidden relative shadow-enterprise group border border-slate-100">
             <iframe 
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d484870.1695286941!2d-77.25662855116282!3d18.299403835116998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8edafc2d4e829e83%3A0x79e1cab21b36bf71!2sSamkhi%20Limited%20-%20Solar%20Company!5e0!3m2!1sen!2sjm!4v1777754028673!5m2!1sen!2sjm" 
               className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700"
               allowFullScreen={true}
               loading="lazy" 
               referrerPolicy="no-referrer-when-downgrade"
             ></iframe>
             <div className="absolute top-8 left-8 pointer-events-none">
                <div className="bg-secondary text-white p-6 rounded-3xl shadow-2xl relative z-10 border border-white/20">
                   <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-cta rounded-xl text-secondary">
                         <MapPin size={20} />
                      </div>
                      <div>
                         <h4 className="font-display font-black text-lg">Samkhi Limited</h4>
                         <p className="text-slate-400 text-xs uppercase tracking-widest">Main Showroom</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactCard({ icon: Icon, title, info, subInfo, href }: any) {
  const content = (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-enterprise transition-all duration-500 group flex items-center gap-6">
      <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-primary transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
        <Icon size={24} className="stroke-[2.5]" />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className="font-bold text-secondary text-base leading-tight mb-1">{info}</p>
        <p className="text-xs text-slate-500 font-medium">{subInfo}</p>
      </div>
    </div>
  );

  return href ? <a href={href}>{content}</a> : <div>{content}</div>;
}
