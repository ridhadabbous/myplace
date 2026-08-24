/* ==========================================================================
   MYPLACE.TN RUNTIME CONFIGURATION
   Placeholders are replaced at deploy time by GitHub Actions secrets.
   All Supabase access is delegated to the Cloudflare Worker; the browser
   only needs the Worker URL.
   ========================================================================== */

window.CONFIG = {
    API_URL: "__API_URL__"
};
