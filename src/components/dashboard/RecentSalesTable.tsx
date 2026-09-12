"use client";

import { Sale } from "@/types/types";
import { Chip, Table } from "@heroui/react";
import { formatDate, formatMoney } from "@/lib/format";

const statusColor: Record<
  Sale["paymentStatus"],
  "success" | "warning" | "danger"
> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  UNPAID: "danger",
};

export function RecentSalesTable({ sales }: { sales: Sale[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Recent sales" className="w-full">
          <Table.Header>
            <Table.Column id="saleNumber">Sale</Table.Column>
            <Table.Column id="date">Date</Table.Column>
            <Table.Column id="status">Status</Table.Column>
            <Table.Column id="total">Amount</Table.Column>
          </Table.Header>
          <Table.Body
            items={sales}
            renderEmptyState={() => (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-secondary">
                  No completed sales yet
                </p>
                <p className="mt-1 text-xs text-secondary/55">
                  Once a draft sale is completed, it will appear here.
                </p>
              </div>
            )}
          >
            {(sale) => (
              <Table.Row id={sale.id}>
                <Table.Cell>
                  <span className="font-medium">{sale.saleNumber}</span>
                  <span className="block text-xs text-foreground/50">
                    {sale.items.length} item{sale.items.length === 1 ? "" : "s"}
                  </span>
                </Table.Cell>
                <Table.Cell>{formatDate(sale.createdAt)}</Table.Cell>
                <Table.Cell>
                  <Chip color={statusColor[sale.paymentStatus]}>
                    {sale.paymentStatus.replace("_", " ")}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="font-semibold">
                  {formatMoney(sale.total)}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
