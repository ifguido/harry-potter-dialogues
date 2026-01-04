/**
 * Displays a short toast message at the bottom of the screen.
 */
export function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 1200);
}
