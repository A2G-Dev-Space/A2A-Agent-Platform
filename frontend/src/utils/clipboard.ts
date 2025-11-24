/**
 * Cross-browser clipboard utility that works in both HTTP and HTTPS contexts
 * Falls back to document.execCommand('copy') when navigator.clipboard is not available
 */

/**
 * Copy text to clipboard with HTTP/HTTPS compatibility
 * @param text - The text to copy
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern API (HTTPS only)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API failed:', err);
      // Fall through to alternative method
    }
  }

  // Method 2: Fallback for HTTP and older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Make it invisible and position outside viewport
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';

  document.body.appendChild(textArea);

  try {
    // Select the text
    textArea.focus();
    textArea.select();

    // Try to set selection range for better compatibility
    textArea.setSelectionRange(0, textArea.value.length);

    // Execute copy command
    const success = document.execCommand('copy');

    if (!success) {
      console.error('document.execCommand("copy") failed');
      return false;
    }

    return true;
  } catch (err) {
    console.error('Fallback copy method failed:', err);
    return false;
  } finally {
    // Clean up
    document.body.removeChild(textArea);
  }
}

/**
 * Copy text to clipboard and show toast notification
 * @param text - The text to copy
 * @param successMessage - Optional success message (default: "Copied to clipboard")
 * @param errorMessage - Optional error message (default: "Failed to copy")
 */
export async function copyToClipboardWithToast(
  text: string,
  successMessage: string = 'Copied to clipboard',
  errorMessage: string = 'Failed to copy'
): Promise<void> {
  // Import toast dynamically to avoid circular dependencies
  const { default: toast } = await import('react-hot-toast');

  const success = await copyToClipboard(text);

  if (success) {
    toast.success(successMessage);
  } else {
    toast.error(errorMessage);
  }
}