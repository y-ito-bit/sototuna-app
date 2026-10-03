// Public beta connection settings. Authorization is enforced by Supabase Auth and RLS.
// Build-time environment variables override these dedicated beta defaults.
export const backendConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://gdodurlehfyeilxtecoz.supabase.co',
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_y2Y3M2en7G_gA-wAOg7Buw_VdvmAwp4',
};
