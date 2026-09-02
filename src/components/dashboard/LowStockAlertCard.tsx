"use client";

import Link from "next/link";
import { Card, buttonVariants } from "@heroui/react";

interface LowStockAlertCardProps {
  lowStock: number;
  outOfStock: number;
}

export function LowStockAlertCard({
  lowStock,
  outOfStock,
}: LowStockAlertCardProps) {
  const hasIssues = lowStock > 0 || outOfStock > 0;

  return (
    <Card className="bg-secondary text-white">
      <Card.Header>
        <Card.Title className="text-white">
          {hasIssues ? "Stock needs attention" : "Stock levels look good"}
        </Card.Title>
        <Card.Description className="text-white/60">
          {hasIssues
            ? `${lowStock} product${lowStock === 1 ? "" : "s"} running low, ${outOfStock} out of stock.`
            : "All tracked products are above their minimum stock level."}
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Link
          href="/inventory"
          className={
            buttonVariants({ variant: "primary" }) + " w-full justify-center"
          }
        >
          View inventory
        </Link>
      </Card.Footer>
    </Card>
  );
}
