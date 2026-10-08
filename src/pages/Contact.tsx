import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const leadData = {
        id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
        source: 'contact-message',
        stage: 'new',
        createdAt: new Date().toISOString(),
        notes: ''
      };

      await setDoc(doc(db, 'leads', id), leadData);
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: ''
      });
    } catch (err) {
      console.error("Error submitting contact lead:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'leads');
      } catch (wrapperErr) {
        setStatus('idle');
      }
    }
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

      <section className="pt-12 pb-8 md:py-24 -mt-10 relative z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Contact Info Cards */}
            <div className="space-y-10">
              {/* Ocho Rios Group */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Support & Hours</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
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
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Email Address</label>
                        <input 
                          type="email" 
                          placeholder="Your professional email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Subject</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium appearance-none cursor-pointer"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                          >
                            <option value="General Inquiry">General Inquiry</option>
                            <option value="LED Lighting Project">LED Lighting Project</option>
                            <option value="Residential Solar Quote">Residential Solar Quote</option>
                            <option value="Commercial Energy Solutions">Commercial Energy Solutions</option>
                            <option value="Technical Support">Technical Support</option>
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
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
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
      <section className="pt-4 pb-12 md:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-slate-200 h-[500px] rounded-[3rem] overflow-hidden relative shadow-enterprise group border border-slate-100">
             <iframe 
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d484870.1695286941!2d-77.25662855116282!3d18.299403835116998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8edafc2d4e829e83%3A0x79e1cab21b36bf71!2sSamkhi%20Limited%20-%20Solar%20Company!5e0!3m2!1sen!2sjm!4v1777754028673!5m2!1sen!2sjm" 
               className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700"
               allowFullScreen={true}
               loading="lazy" 
               referrerPolicy="no-referrer-when-downgrade"
             ></iframe>
             <div className="hidden md:block absolute top-6 right-6 md:top-8 md:right-8 pointer-events-none">
                <div className="bg-white text-secondary px-5 py-4 md:px-6 md:py-4.5 rounded-2xl md:rounded-3xl shadow-2xl relative z-10 border border-slate-200/80 flex items-center gap-4">
                   <img 
                     src="https://lh3.googleusercontent.com/d/1y5j5nsQpvc5Rgdo2OP_ZN6K9sAqMg3Uw" 
                     alt="Samkhi Ltd." 
                     className="h-8 md:h-10 w-auto object-contain"
                     referrerPolicy="no-referrer"
                   />
                   <div className="h-7 w-px bg-slate-200" />
                   <div>
                      <span className="font-display font-black text-secondary text-sm md:text-base leading-tight block">Main Showroom</span>
                      <span className="text-[10px] md:text-[11px] font-bold text-primary uppercase tracking-widest block">Ocho Rios, Jamaica</span>
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

  return href ? <a href={href} className="block">{content}</a> : <div className="block">{content}</div>;
}
