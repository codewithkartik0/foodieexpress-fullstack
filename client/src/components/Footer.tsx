import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Order delicious food from your favourite local restaurants. Fast delivery, secure payments,
            transparent pricing.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink-900">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>About us</li>
            <li>Careers</li>
            <li>Contact</li>
            <li>Press</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink-900">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
            <li>Refund Policy</li>
            <li>Help Center</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} FoodieExpress. Academic project — built for educational purposes.
      </div>
    </footer>
  );
}
