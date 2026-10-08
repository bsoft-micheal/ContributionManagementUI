import React from "react";
import EventFormPage from "../../pages/events/EventFormPage";

/**
 * EventFormDialog wraps EventFormPage in dialog mode (isDialog={true}),
 * ensuring 100% component and layout parity with the Add/Edit Event page.
 */
export default function EventFormDialog({
  open,
  onClose,
  event,
  eventTypes = [],
  members = [],
  onSaveSuccess,
  ...restProps
}) {
  return (
    <EventFormPage
      isDialog={true}
      open={open}
      onClose={onClose}
      event={event}
      eventTypes={eventTypes}
      members={members}
      onSaveSuccess={onSaveSuccess}
      {...restProps}
    />
  );
}
