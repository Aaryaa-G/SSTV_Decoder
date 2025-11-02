// src/components/Toast.jsx
import React, { useContext } from "react";
import { NotificationContext } from "../pages/NotificationContext";

const Toast = () => {
  const { notifications, removeNotification } = useContext(NotificationContext);

  const getToastStyles = (type) => {
    switch (type) {
      case "success":
        return {
          bgColor: "bg-green-900/90",
          borderColor: "border-green-600",
          textColor: "text-green-200",
          icon: "✓",
          iconColor: "text-green-400",
        };
      case "error":
        return {
          bgColor: "bg-red-900/90",
          borderColor: "border-red-600",
          textColor: "text-red-200",
          icon: "✕",
          iconColor: "text-red-400",
        };
      case "warning":
        return {
          bgColor: "bg-yellow-900/90",
          borderColor: "border-yellow-600",
          textColor: "text-yellow-200",
          icon: "⚠",
          iconColor: "text-yellow-400",
        };
      case "info":
      default:
        return {
          bgColor: "bg-blue-900/90",
          borderColor: "border-blue-600",
          textColor: "text-blue-200",
          icon: "ℹ",
          iconColor: "text-blue-400",
        };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => {
        const styles = getToastStyles(notification.type);
        return (
          <div
            key={notification.id}
            className={`${styles.bgColor} ${styles.borderColor} border rounded-lg p-4 flex items-start gap-3 pointer-events-auto min-w-80 max-w-md shadow-lg animate-slide-in`}
          >
            <span className={`${styles.iconColor} text-xl font-bold mt-0.5`}>
              {styles.icon}
            </span>
            <div className="flex-1">
              <p className={`${styles.textColor} text-sm`}>{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`${styles.textColor} hover:opacity-70 text-lg font-bold ml-2`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;