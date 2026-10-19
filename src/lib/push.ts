import { playNotificationChime } from './audio.ts';

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('푸시 알림 권한 요청 실패:', error);
    return 'denied';
  }
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export function triggerPushAlert(title: string, body: string, icon = '💌') {
  // Always play gentle audio chime
  playNotificationChime();

  if (isPushSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://api.iconify.design/lucide:heart-handshake.svg?color=%2310b981',
        tag: 'secret-counseling-' + Date.now(),
      });
    } catch (e) {
      console.warn('Native notification trigger failed:', e);
    }
  }
}
