// showSweetAlert.js
import Swal from 'sweetalert2';

export const showSweetAlert = ({
  title = 'Alert',
  text = '',
  icon = 'info', // can be 'success', 'error', 'warning', 'info', or 'question'
  confirmButtonText = 'OK',
  showCancelButton = false,
  cancelButtonText = 'Cancel',
  onConfirm = null,
  onCancel = null,
}) => {
  Swal.fire({
    title,
    text,
    icon,
    toast: true,
    position: 'top-end', // Position in the upper-right corner
    showConfirmButton: false, // Hide the confirm button
    timer: 3000, // Automatically close after 3 seconds
    timerProgressBar: true, // Show progress bar
  }).then((result) => {
    if (result.isConfirmed && onConfirm) {
      onConfirm();
    } else if (result.dismiss === Swal.DismissReason.cancel && onCancel) {
      onCancel();
    }
  });
};
