/* ==========================================================================
   MYPLACE.TN RUNTIME CONFIGURATION
   Placeholders are replaced at deploy time by GitHub Actions secrets.
   ========================================================================== */

window.CONFIG = {
    SUPABASE_URL: "__SUPABASE_URL__",
    SUPABASE_ANON_KEY: "__SUPABASE_ANON_KEY__",
    API_URL: "__API_URL__"
};
