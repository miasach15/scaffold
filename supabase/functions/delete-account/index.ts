// Supabase Edge Function: permanently deletes the calling user's account and every
// piece of their data. Every table's user_id column is
// "references auth.users(id) on delete cascade" (see schema.sql) — profiles, tasks,
// events, goals, milestones, goal_actions, habits, journal_entries, edu_items,
// grade_classes/categories, inbox_items, push subscriptions, everything. So deleting
// the auth.users row via the Admin API is enough; Postgres cascades the rest on its own.
//
// Deploy with:  supabase functions deploy delete-account
// Needs no extra secrets — SUPABASE_URL, SUPABASE_ANON_KEY, and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically to every Edge Function.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401, headers: corsHeaders });
    }

    // Verify who's actually calling from their own JWT (forwarded automatically by
    // supabase.functions.invoke on the client) — never trust a client-supplied user id
    // for something this destructive.
    const authedClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Could not verify who you are. Try signing in again." }), { status: 401, headers: corsHeaders });
    }

    // Service-role client, used only for this one privileged call.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
