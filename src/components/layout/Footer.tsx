import { Link } from "react-router-dom";
import { 
  Stethoscope, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useFooterSettings } from "@/hooks/useFooterSettings";
import medicareLogo from "@/assets/medicare-logo.png";

export function Footer() {
  const { logoUrl, siteName } = useSiteSettings();
  const { 
    address, 
    phone, 
    email, 
    socialLinks, 
    copyright 
  } = useFooterSettings();

  const socialIcons: Record<string, typeof Facebook> = {
    Facebook,
    Twitter,
    Instagram,
    LinkedIn: Linkedin,
  };

  return (
    <footer className="bg-header text-header-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={`${siteName} Logo`} className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-header-foreground">
                {siteName}
              </span>
            </Link>
            <p className="text-header-foreground/70 text-sm leading-relaxed">
              Your trusted healthcare partner. Book appointments with top doctors,
              track your health metrics, and get expert medical advice.
            </p>
            <div className="flex gap-2">
              {socialLinks.length > 0 ? (
                socialLinks.map((link) => {
                  const IconComponent = socialIcons[link.name] || Facebook;
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-header-foreground/10 flex items-center justify-center hover:bg-primary transition-colors"
                      aria-label={link.name}
                    >
                      <IconComponent className="w-4 h-4" />
                    </a>
                  );
                })
              ) : (
                [Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-xl bg-header-foreground/10 flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: "Book Appointment", href: "/booking" },
                { label: "Find Doctors", href: "/booking" },
                { label: "Symptoms Checker", href: "/symptoms" },
                { label: "Become a Doctor", href: "/become-doctor" },
                { label: "My Profile", href: "/profile" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-header-foreground/70 hover:text-header-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Our Services</h4>
            <ul className="space-y-3">
              {[
                "General Consultation",
                "Specialist Appointments",
                "Lab Tests",
                "Health Checkups",
                "Online Prescriptions",
              ].map((service) => (
                <li key={service}>
                  <span className="text-header-foreground/70 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-primary shrink-0" />
                <span className="text-header-foreground/70 text-sm whitespace-pre-line">
                  {address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-header-foreground/70 text-sm hover:text-header-foreground transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href={`mailto:${email}`} className="text-header-foreground/70 text-sm hover:text-header-foreground transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-header-foreground/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-header-foreground/50 text-sm">
            {copyright}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-header-foreground/50 hover:text-header-foreground text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-header-foreground/50 hover:text-header-foreground text-sm transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
