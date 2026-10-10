import React, { useState, useCallback } from "react";
import AppUnsavedChangesDialog from "../components/common/AppUnsavedChangesDialog";

/**
 * Reusable Hook for managing unsaved form changes confirmation.
 * 
 * @param {Object} options
 * @param {boolean|Function} options.isDirty - Boolean or function returning boolean indicating if form has unsaved modifications.
 * @param {Function} options.onQuit - Callback to execute when user chooses to quit/discard changes (e.g. navigate(-1) or navigate("/users")).
 * @param {string} [options.title] - Optional dialog title.
 * @param {string} [options.content] - Optional dialog content.
 * @param {string} [options.keepEditingText] - Optional button label (default: "Keep Editing").
 * @param {string} [options.quitChangesText] - Optional button label (default: "Quit Changes").
 * 
 * @returns {Object} {
 *   showUnsavedDialog,
 *   handleCancelRequest,
 *   handleKeepEditing,
 *   handleConfirmQuit,
 *   UnsavedChangesDialog
 * }
 */
export default function useUnsavedChanges({
  isDirty = false,
  onQuit,
  title,
  content,
  keepEditingText,
  quitChangesText,
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingQuitCallback, setPendingQuitCallback] = useState(null);

  /**
   * Evaluates whether the form is currently dirty.
   */
  const checkIsDirty = useCallback(() => {
    if (typeof isDirty === "function") {
      return Boolean(isDirty());
    }
    return Boolean(isDirty);
  }, [isDirty]);

  /**
   * Triggers cancel flow. If form has unsaved changes, opens confirmation modal.
   * If clean, immediately invokes onQuit or custom fallback.
   * @param {Function} [customQuitFn] Optional custom quit callback for specific buttons (e.g. back icon vs cancel button).
   */
  const handleCancelRequest = useCallback(
    (customQuitFn) => {
      const dirty = checkIsDirty();
      const quitFn = typeof customQuitFn === "function" ? customQuitFn : onQuit;

      if (dirty) {
        setPendingQuitCallback(() => quitFn);
        setShowDialog(true);
      } else {
        if (typeof quitFn === "function") {
          quitFn();
        }
      }
    },
    [checkIsDirty, onQuit]
  );

  /**
   * User chooses to stay and keep editing.
   */
  const handleKeepEditing = useCallback(() => {
    setShowDialog(false);
    setPendingQuitCallback(null);
  }, []);

  /**
   * User confirms discarding changes and quitting.
   */
  const handleConfirmQuit = useCallback(() => {
    setShowDialog(false);
    const quitFn = pendingQuitCallback || onQuit;
    if (typeof quitFn === "function") {
      quitFn();
    }
    setPendingQuitCallback(null);
  }, [pendingQuitCallback, onQuit]);

  /**
   * Ready-to-render Dialog component for ease of use.
   */
  const UnsavedChangesDialog = useCallback(
    () => (
      <AppUnsavedChangesDialog
        open={showDialog}
        onKeepEditing={handleKeepEditing}
        onQuitChanges={handleConfirmQuit}
        title={title}
        content={content}
        keepEditingText={keepEditingText}
        quitChangesText={quitChangesText}
      />
    ),
    [
      showDialog,
      handleKeepEditing,
      handleConfirmQuit,
      title,
      content,
      keepEditingText,
      quitChangesText,
    ]
  );

  return {
    showUnsavedDialog: showDialog,
    setShowUnsavedDialog: setShowDialog,
    handleCancelRequest,
    handleKeepEditing,
    handleConfirmQuit,
    UnsavedChangesDialog,
  };
}
