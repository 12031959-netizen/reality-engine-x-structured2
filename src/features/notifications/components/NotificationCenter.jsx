import { useEffect } from "react";
import { BellRing } from "lucide-react";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../hooks/useAuth";

export default function NotificationCenter() {
  const { account, markNotificationsSeen, sendAppReminder } = useAuth();
  const notifications = account.notificationLog || [];

  useEffect(() => {
    markNotificationsSeen();
  }, []);

  return (
    <div className="page-stack">
      <article className="panel notification-center">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h2>Reminder inbox</h2>
            <p>
              {notifications.length === 1
                ? "You have 1 message."
                : `You have ${notifications.length} messages.`}
            </p>
          </div>

          <Button onClick={markNotificationsSeen} variant="ghost">
            <BellRing size={18} />
            Mark All as Read
          </Button>
        </div>

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="notification-item">
              No reminders yet. Enable app reminders in Settings or send a test
              reminder.
            </div>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className="notification-item">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <small>{item.createdAt}</small>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
}
