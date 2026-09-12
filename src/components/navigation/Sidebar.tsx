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
  MdPointOfSale,
  MdPeople,
  MdInventory,
  MdRequestQuote,
  MdDirectionsCar,
  MdGroup,
  MdFactory,
  MdCategory,
} from "react-icons/md";
import { useState } from "react";
import { cn, Tooltip } from "@heroui/react";
import { BiLogOut } from "react-icons/bi";
import { usePathname } from "next/navigation";
import useUserStore from "@/stores/userStore";
import LogoutDialog from "../modals/LogoutModal";
import { MdAddCircleOutline } from "react-icons/md";
import useDashboardStore from "@/stores/useDashboardStore";

type LinkItem = {
  name: string;
  href: string;
  icon: IconType;
  permissions?: string[];
};

const tooltipClass =
  "rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-white shadow-[0_10px_30px_rgba(8,15,23,0.35)]";

function SideBar() {
  const pathname = usePathname();
  const role = useUserStore((state) => state.role);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const isCompact = useDashboardStore((state) => state.isSideBarCompact);

  const links: LinkItem[] = [
    {
      name: "Home",
      href: "/",
      icon: MdSpaceDashboard,
      permissions: ["admin", "super_admin"],
    },
    {
      name: "POS",
      href: "/pos",
      icon: MdPointOfSale,
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
      name: "Sales",
      href: "/operations",
      icon: MdReceiptLong,
    },
    {
      name: "Customers",
      href: "/customers",
      icon: MdPeople,
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: MdInventory,
      permissions: ["admin", "super_admin"],
    },
    {
      name: "Quotations",
      href: "/quotations",
      icon: MdRequestQuote,
    },
    {
      name: "Vehicles",
      href: "/vehicles",
      icon: MdDirectionsCar,
    },
    {
      name: "Brands",
      href: "/brands",
      icon: MdFactory,
    },
    {
      name: "Categories",
      href: "/categories",
      icon: MdCategory,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: MdBarChart,
      permissions: ["admin", "super_admin"],
    },
    {
      name: "Finance",
      href: "/finance",
      icon: MdAttachMoney,
      permissions: ["admin", "super_admin"],
    },
  ];

  const bottomLinks: LinkItem[] = [
    {
      name: "Users",
      href: "/users",
      icon: MdGroup,
      permissions: ["admin", "super_admin"],
    },
    {
      name: "Security",
      href: "/security",
      icon: MdShield,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: MdSettings,
      permissions: ["admin", "super_admin"],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleToogleCompact = (value: boolean) => {
    useDashboardStore.setState((state) => {
      state.isSideBarCompact = value;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col items-center overflow-y-auto overflow-x-hidden rounded-[28px] bg-secondary px-2 pb-3 text-white shadow-[0_30px_80px_rgba(8,15,23,0.18)] duration-300",
        isCompact ? "w-18.5 " : "w-fit",
      )}
    >
      {/* Logo */}
      <button
        onClick={() => handleToogleCompact(!isCompact)}
        className={cn(
          "mb-6 flex h-fit  items-center justify-center rounded-3xl bg-white p-2",
          isCompact ? "w-full" : "w-40",
        )}
      >
        <Image
          src={isCompact ? "/images/logo.jpg" : "/images/logo1.png"}
          alt="Logo"
          width={0}
          height={0}
          sizes="100vw"
          className="h-fit w-full object-contain"
        />
      </button>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-3">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;

          if (
            link.permissions &&
            !link.permissions.some((perm) => role?.permissions?.includes(perm))
          ) {
            return null;
          }

          return (
            <Tooltip delay={100} key={link.name}>
              <Tooltip.Trigger>
                <Link
                  href={link.href}
                  aria-label={link.name}
                  className={`
                  flex h-11 items-center justify-center
                  rounded-2xl transition-all duration-200
                  ${
                    active
                      ? "bg-primary text-secondary shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }
                  ${isCompact ? "w-11 " : "w-40 px-4"}
                `}
                >
                  <Icon className="h-5 w-5" />
                  <span
                    className={cn(
                      "font-medium text-sm whitespace-nowrap ml-3 flex-1 text-left",
                      isCompact && "hidden",
                    )}
                  >
                    {link.name}
                  </span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Content
                placement="right"
                offset={12}
                showArrow
                className={tooltipClass}
              >
                <Tooltip.Arrow />
                {link.name}
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-3">
        {bottomLinks.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;

          if (
            link.permissions &&
            !link.permissions.some((perm) => role?.permissions?.includes(perm))
          ) {
            return null;
          }

          return (
            <Tooltip delay={100} key={link.name}>
              <Tooltip.Trigger>
                <Link
                  href={link.href}
                  aria-label={link.name}
                  className={`
                  flex h-11 w-11 items-center justify-center
                  rounded-2xl transition-all duration-200
                  ${
                    active
                      ? "bg-primary text-secondary shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }
                  ${isCompact ? "w-11 " : "w-40 px-4"}
                `}
                >
                  <Icon className="h-5 w-5" />
                  <span
                    className={cn(
                      "font-medium text-sm whitespace-nowrap ml-3 flex-1 text-left",
                      isCompact && "hidden",
                    )}
                  >
                    {link.name}
                  </span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Content
                placement="right"
                offset={12}
                showArrow
                className={tooltipClass}
              >
                <Tooltip.Arrow />
                {link.name}
              </Tooltip.Content>
            </Tooltip>
          );
        })}

        {/* User / Profile */}
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className={cn(
            "mt-3 flex h-10 p-2  overflow-hidden rounded-full border-2 border-white/20 bg-white/10 transition hover:border-primary",
            isCompact ? "w-10 items-center justify-center" : "w-40",
          )}
        >
          <BiLogOut className="w-8 h-full" />
          <span
            className={cn(
              "font-medium text-sm whitespace-nowrap ml-2",
              isCompact && "hidden",
            )}
          >
            Logout
          </span>
        </button>
      </div>
      <LogoutDialog
        isOpen={showLogoutDialog}
        onOpenChange={() => setShowLogoutDialog(false)}
      />
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: MdSpaceDashboard },
    { name: "Sales", href: "/operations", icon: MdReceiptLong },
    {
      name: "Add",
      href: "/products/new",
      icon: MdAddCircleOutline,
      accent: true,
    },
    { name: "Products", href: "/products", icon: MdGridView },
    { name: "Settings", href: "/settings", icon: MdSettings },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="rounded-[24px] border border-black/10 bg-secondary px-3 py-2 text-white shadow-[0_20px_60px_rgba(8,15,23,0.24)]">
      <div className="grid grid-cols-5 items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.accent) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-secondary shadow-sm"
                aria-label={item.name}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] transition ${
                active ? "text-primary" : "text-white/55"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default SideBar;
