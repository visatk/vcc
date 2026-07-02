import React from 'react';
import { motion } from 'framer-motion';

export default function FaqPage() {
  const faqs = [
    {
      q: "How do I receive my digital purchase?",
      a: "Once your payment (including crypto confirmations) is complete, the product will be instantly available for download or access in your User Dashboard."
    },
    {
      q: "What cryptocurrencies do you accept?",
      a: "We currently accept Bitcoin (BTC) and Litecoin (LTC) via our secure ApiRone integration."
    },
    {
      q: "Do you offer refunds?",
      a: "Due to the nature of digital goods, we generally do not offer refunds once a product has been downloaded or a serial key has been dispensed. Please see our Refund Policy for exceptions."
    },
    {
      q: "How does the 'Pay What You Want' pricing work?",
      a: "Some of our products have a minimum required price, but you can choose to pay more to support the developers if you find the tool valuable!"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="collapse collapse-arrow bg-base-200 border border-base-300">
              <input type="radio" name="faq-accordion" defaultChecked={index === 0} /> 
              <div className="collapse-title text-xl font-medium">
                {faq.q}
              </div>
              <div className="collapse-content"> 
                <p className="opacity-80">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
