import { db } from './db';
import { Notification, NotificationType, NotificationStatus } from '../src/types';
import { broadcastEvent } from './wsServer';

export interface CreateNotificationParams {
  order_id: string;
  user_id: string;
  notification_type?: NotificationType;
  event_type: string;
  recipient?: string;
  subject: string;
  message: string;
}

export function createNotificationForEvent(params: CreateNotificationParams): Notification {
  const user = db.users.get(params.user_id);
  const now = new Date().toISOString();

  // Resolve recipient email or phone
  let recipient = params.recipient;
  if (!recipient && user) {
    recipient = params.notification_type === 'EMAIL' ? user.email : user.phone;
  }
  if (!recipient) recipient = 'customer@lastmile.logistics';

  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const notifType: NotificationType = params.notification_type || (params.event_type.includes('FAIL') ? 'EMAIL' : 'SMS');

  const record: Notification = {
    id: notificationId,
    order_id: params.order_id,
    user_id: params.user_id,
    notification_type: notifType,
    event_type: params.event_type,
    recipient,
    subject: params.subject,
    message: params.message,
    status: 'SENT',
    sent_at: now,
    created_at: now,
  };

  db.notifications.set(record.id, record);

  // Also dispatch matching secondary channel (Email + SMS) if it's a critical event like failed delivery or confirmation
  if (params.event_type === 'FAILED_DELIVERY' || params.event_type === 'ORDER_CONFIRMED' || params.event_type === 'ORDER_DELIVERED') {
    const alternateType: NotificationType = notifType === 'SMS' ? 'EMAIL' : 'SMS';
    const altRecipient = alternateType === 'EMAIL' ? (user?.email || 'customer@lastmile.logistics') : (user?.phone || '+919844000000');
    const altId = `notif-${Date.now()}-alt-${Math.random().toString(36).substring(2, 5)}`;
    
    const altRecord: Notification = {
      id: altId,
      order_id: params.order_id,
      user_id: params.user_id,
      notification_type: alternateType,
      event_type: params.event_type,
      recipient: altRecipient,
      subject: params.subject,
      message: params.message,
      status: 'SENT',
      sent_at: now,
      created_at: now,
    };
    db.notifications.set(altId, altRecord);
  }

  // Broadcast real-time notification to client
  broadcastEvent({
    type: 'NOTIFICATION_CREATED',
    payload: record,
  });

  return record;
}
