import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer p-10 bg-base-300 text-base-content mt-12">
      <nav>
        <h6 className="footer-title">Services</h6>
        <Link to="/" className="link link-hover">Script Development</Link>
        <Link to="/" className="link link-hover">App Hosting</Link>
        <Link to="/" className="link link-hover">API Integration</Link>
      </nav>
      <nav>
        <h6 className="footer-title">Company</h6>
        <Link to="/about" className="link link-hover">About us</Link>
        <Link to="/contact" className="link link-hover">Contact</Link>
        <Link to="/faq" className="link link-hover">FAQ</Link>
      </nav>
      <nav>
        <h6 className="footer-title">Legal</h6>
        <Link to="/terms" className="link link-hover">Terms of use</Link>
        <Link to="/privacy" className="link link-hover">Privacy policy</Link>
        <Link to="/crypto-policy" className="link link-hover">Crypto Policy</Link>
      </nav>
    </footer>
  );
}
