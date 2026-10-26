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
   * Triggers cancel flow. Disables confirmation modal completely as requested;
   * immediately invokes onQuit or custom fallback.
   * @param {Function} [customQuitFn] Optional custom quit callback for specific buttons.
   */
  const handleCancelRequest = useCallback(
    (customQuitFn) => {
      const quitFn = typeof customQuitFn === "function" ? customQuitFn : onQuit;
      if (typeof quitFn === "function") {
        quitFn();
      }
    },
    [onQuit]
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
   * Dialog component renders null to completely eliminate the unsaved changes popup.
   */
  const UnsavedChangesDialog = useCallback(() => null, []);

  return {
    showUnsavedDialog: showDialog,
    setShowUnsavedDialog: setShowDialog,
    handleCancelRequest,
    handleKeepEditing,
    handleConfirmQuit,
    UnsavedChangesDialog,
  };
}
