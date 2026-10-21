import React from "react";
import ExpenseFormDialog from "../expenses/ExpenseFormDialog";

export default function EventAddExpenseDialog({
  open,
  onClose,
  event,
  onExpenseSaved,
}) {
  return (
    <ExpenseFormDialog
      open={open}
      onClose={onClose}
      initialEvent={event}
      onSaved={onExpenseSaved}
    />
  );
}
