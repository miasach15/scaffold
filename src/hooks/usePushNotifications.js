import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const NATIVE = Capacitor.isNativePlatform();

function urlBase64ToUint8Array(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Turns this device into a push target for "What now?" reminders. Two completely
// different mechanisms under one interface: the App Store build (Capacitor) registers
// for real APNs push and stores a device token in device_push_tokens; a browser/PWA
// install uses the standard Web Push API and stores a subscription in
// push_subscriptions. Either way, subscribe/unsubscribe/subscribed behave the same.
//
// `shouldBeSubscribed` — whether ANY of the profile's own reminder toggles (morning
// plan, what-now nudges, time-to-start) is on — lets this hook self-heal instead of
// just reporting a mismatch for someone else to notice: a saved setting turned on from
// a different device, a subscription that silently went stale, or its database row
// disappearing all used to leave this device reading "on" while quietly receiving
// nothing until someone manually toggled it off and back on. Now it just reconnects on
// its own the moment that becomes knowable. Instantiate this ONCE per session, high up
// (ScaffoldApp), not separately inside Settings — two independent instances racing their
// own subscribe() calls is exactly the kind of bug this is meant to prevent.
export function usePushNotifications(userId, shouldBeSubscribed = false) {
  const [supported] = useState(() => NATIVE || ("serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY));
  const [subscribed, setSubscribed] = useState(false);
  // True once refresh() has actually resolved at least once — guards the auto-heal
  // effect below from firing on the initial `subscribed === false` default before the
  // real state is even known, which would otherwise attempt a needless resubscribe on
  // every single mount.
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const autoHealedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!supported) { setChecked(true); return; }
    try {
      if (NATIVE) {
        const status = await PushNotifications.checkPermissions();
        setSubscribed(status.receive === "granted");
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setSubscribed(false);
        } else {
          // The browser remembering a subscription doesn't guarantee the matching row
          // is still in the database (it can be deleted independently, or an earlier
          // upsert could have failed silently) — confirm the row the server would
          // actually send to is really there, not just that this device once subscribed.
          const { data } = await supabase.from("push_subscriptions").select("id").eq("endpoint", sub.endpoint).maybeSingle();
          setSubscribed(!!data);
        }
      }
    } catch {
      setSubscribed(false);
    } finally {
      setChecked(true);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Native registration is event-based (register() kicks it off, the token arrives
  // later via the 'registration' listener) — wire the listeners up once.
  useEffect(() => {
    if (!NATIVE || !userId) return;
    const handles = [];
    PushNotifications.addListener("registration", async (token) => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        await supabase.from("device_push_tokens").upsert(
          { user_id: userId, platform: "ios", token: token.value, timezone },
          { onConflict: "token" }
        );
        setSubscribed(true);
      } catch (e) {
        setError(e.message || "Couldn't save this device for notifications.");
      } finally {
        setBusy(false);
      }
    }).then((h) => handles.push(h));
    PushNotifications.addListener("registrationError", (err) => {
      setError(err.error || "Couldn't turn on notifications.");
      setBusy(false);
    }).then((h) => handles.push(h));
    return () => handles.forEach((h) => h.remove());
  }, [userId]);

  const subscribe = useCallback(async () => {
    if (!supported || !userId || busy) return false;
    setBusy(true);
    setError(null);

    if (NATIVE) {
      try {
        const status = await PushNotifications.requestPermissions();
        if (status.receive !== "granted") {
          setError("Notifications were blocked. Allow them for Scaffold in iOS Settings to turn this on.");
          setBusy(false);
          return false;
        }
        await PushNotifications.register(); // resolves immediately; the token arrives via the 'registration' listener above
        return true;
      } catch (e) {
        setError(e.message || "Couldn't turn on notifications.");
        setBusy(false);
        return false;
      }
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications were blocked. Allow them for this site in your browser settings to turn this on.");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth_key: json.keys.auth,
          timezone,
        },
        { onConflict: "endpoint" }
      );
      if (dbError) throw dbError;
      setSubscribed(true);
      return true;
    } catch (e) {
      setError(e.message || "Couldn't turn on notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, userId, busy]);

  const unsubscribe = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (NATIVE) {
        await supabase.from("device_push_tokens").delete().eq("user_id", userId).eq("platform", "ios");
        await PushNotifications.unregister();
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
      }
      setSubscribed(false);
    } catch (e) {
      setError(e.message || "Couldn't turn off notifications.");
    } finally {
      setBusy(false);
    }
  }, [supported, busy, userId]);

  // The actual self-heal: once this device's real state is known (checked) and a
  // mismatch is found (a setting wants push on, but this device isn't the one actually
  // subscribed), reconnect automatically. Permission was presumably already granted the
  // first time someone turned any of these on, so re-requesting it here is a silent
  // no-op — no new prompt, no visible interruption. Attempted at most once per session;
  // if it fails (e.g. permission was later revoked), `error` carries the reason and this
  // won't loop retrying it.
  useEffect(() => {
    if (!checked || !shouldBeSubscribed || !supported || subscribed || busy || autoHealedRef.current) return;
    autoHealedRef.current = true;
    subscribe();
  }, [checked, shouldBeSubscribed, supported, subscribed, busy, subscribe]);

  return { supported, subscribed, checked, busy, error, subscribe, unsubscribe };
}
