"use client";

import Link from "next/link";
import Image from "next/image";
import { IconType } from "react-icons";
import {
  MdSpaceDashboard,
  MdSearch,
  MdGridView,
  MdReceiptLong,
  MdBarChart,
  MdAttachMoney,
  MdSettings,
  MdShield,
} from "react-icons/md";
import { usePathname } from "next/navigation";

type LinkItem = {
  name: string;
  href: string;
  icon: IconType;
};

function SideBar() {
  const pathname = usePathname();

  const links: LinkItem[] = [
    {
      name: "Home",
      href: "/",
      icon: MdSpaceDashboard,
    },
    {
      name: "Search",
      href: "/search",
      icon: MdSearch,
    },
    {
      name: "Products",
      href: "/products",
      icon: MdGridView,
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: MdReceiptLong,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: MdBarChart,
    },
    {
      name: "Finance",
      href: "/finance",
      icon: MdAttachMoney,
    },
  ];

  const bottomLinks: LinkItem[] = [
    {
      name: "Security",
      href: "/security",
      icon: MdShield,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: MdSettings,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="flex h-full w-18 flex-col items-center py-5">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center"
      >
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
      </Link>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-3">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              title={link.name}
              aria-label={link.name}
              className={`
                group relative flex h-11 w-11 items-center justify-center
                rounded-xl transition-all duration-200
                ${
                  active
                    ? "bg-primary text-secondary shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Icon className="h-5.25 w-5.25" />

              {/* Tooltip */}
              <span
                className="
                  pointer-events-none absolute left-14 z-50
                  whitespace-nowrap rounded-lg bg-secondary
                  px-3 py-2 text-xs font-medium text-white
                  opacity-0 shadow-lg transition-opacity
                  group-hover:opacity-100
                "
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-3">
        {bottomLinks.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              title={link.name}
              aria-label={link.name}
              className={`
                group relative flex h-11 w-11 items-center justify-center
                rounded-xl transition-all duration-200
                ${
                  active
                    ? "bg-primary text-secondary shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Icon className="h-5.25 w-5.25" />

              <span
                className="
                  pointer-events-none absolute left-14 z-50
                  whitespace-nowrap rounded-lg bg-secondary
                  px-3 py-2 text-xs font-medium text-white
                  opacity-0 shadow-lg transition-opacity
                  group-hover:opacity-100
                "
              >
                {link.name}
              </span>
            </Link>
          );
        })}

        {/* User / Profile */}
        <button
          type="button"
          className="
            mt-3 flex h-10 w-10 items-center justify-center
            overflow-hidden rounded-full border-2 border-white/20
            bg-white/10 transition hover:border-primary
          "
        >
          <Image
            src="/avatar.png"
            alt="Profile"
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    </aside>
  );
}

export default SideBar;
