"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Workflows" },
    { href: "/data", label: "Data" },
    { href: "/assistant", label: "AI Assistant" },
  ];

  return (
    <nav style={{ backgroundColor: "#1e3d2b" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Image
              src="/nira-logo.png"
              alt="Nira Pet"
              width={120}
              height={36}
              className="brightness-0 invert"
              priority
            />
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm text-white/70">Connected to n8n</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
