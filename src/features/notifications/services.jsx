export function getNotifications(account) {
  return account?.notificationLog || [];
}
