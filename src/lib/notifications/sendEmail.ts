/**
 * shared/client transactional notification dispatch utility.
 * Proxies sending commands cleanly through server endpoints to keep SendGrid keys safe.
 */
export async function sendNotification(
  event_trigger: string,
  to: string,
  data: Record<string, any> = {}
): Promise<void> {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event_trigger,
      to,
      data
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to dispatch email transaction notification via system broker');
  }
}
