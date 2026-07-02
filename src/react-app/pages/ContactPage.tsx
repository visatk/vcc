import React from 'react';
import { motion } from 'framer-motion';

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        <div className="bg-base-200 p-8 rounded-box border border-base-300">
          <p className="mb-6 opacity-80">Have a question or need support with your purchase? Reach out to us using the form below or via our support email.</p>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Message sent! We will get back to you soon."); }}>
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input type="text" required className="input input-bordered w-full" placeholder="Your Name" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <input type="email" required className="input input-bordered w-full" placeholder="you@example.com" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Order ID (if applicable)</span></label>
              <input type="text" className="input input-bordered w-full" placeholder="#123" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Message</span></label>
              <textarea required className="textarea textarea-bordered h-32" placeholder="How can we help?"></textarea>
            </div>
            <button type="submit" className="btn btn-primary w-full sm:w-auto px-8">Send Message</button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
