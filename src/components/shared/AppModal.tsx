"use client";

import { ReactNode } from "react";
import { Modal } from "@heroui/react";

export function AppModal({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  dialogClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  dialogClassName?: string;
}) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container size={size}>
        <Modal.Dialog
          className={`rounded-[24px] bg-card shadow-[0_30px_80px_rgba(8,15,23,0.25)] ${dialogClassName ?? ""}`}
        >
          <Modal.CloseTrigger className="text-secondary/60 hover:bg-black/5" />
          <Modal.Header className="flex-row items-start gap-3">
            {icon ? (
              <Modal.Icon className="rounded-2xl bg-primary text-secondary">
                {icon}
              </Modal.Icon>
            ) : null}
            <div className="flex min-w-0 flex-col">
              <Modal.Heading className="text-lg font-semibold text-secondary">
                {title}
              </Modal.Heading>
              {subtitle ? (
                <p className="mt-0.5 text-xs leading-5 text-secondary/50">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">{children}</Modal.Body>
          {footer ? (
            <Modal.Footer className="flex-col-reverse gap-2 sm:flex-row">
              {footer}
            </Modal.Footer>
          ) : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
