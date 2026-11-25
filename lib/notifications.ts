/**
 * Browser & Mobile Push Notification + Audio Chime Helper
 */

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    return swRegistration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await registerServiceWorker();
  }
  return result;
}

export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playNote = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Crisp 2-tone WhatsApp-style chime
    playNote(880, 0, 0.12);
    playNote(1174.66, 0.1, 0.22);
  } catch {
    // Browser autoplay policy may block audio before user interaction
  }
}

export async function showIncomingNotification(params: {
  title: string;
  body: string;
  conversationId: string;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = (await navigator.serviceWorker.getRegistration()) || null;
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(params.title, {
        body: params.body,
        tag: params.conversationId,
        data: { conversationId: params.conversationId, url: '/' },
      });
    } else {
      const n = new Notification(params.title, {
        body: params.body,
        tag: params.conversationId,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  } catch (err) {
    console.warn('Notification display failed:', err);
  }
}
