import { useCallback, useEffect, useState } from "react";
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
export function usePushNotifications(userId) {
  const [supported] = useState(() => NATIVE || ("serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY));
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      if (NATIVE) {
        const status = await PushNotifications.checkPermissions();
        setSubscribed(status.receive === "granted");
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      }
    } catch {
      setSubscribed(false);
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
          setError("Notifications were blocked — allow them for Scaffold in iOS Settings to turn this on.");
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
        setError("Notifications were blocked — allow them for this site in your browser settings to turn this on.");
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

  return { supported, subscribed, busy, error, subscribe, unsubscribe };
}
