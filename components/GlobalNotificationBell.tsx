"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";

type AppNotification = {
  _id: string;
  id: string;
  userId: string;
  senderId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function GlobalNotificationBell() {
  const currentUser = useUserStore((state: any) => state.currentUser);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?._id && !currentUser?.id) return;
    
    // Polling every 10 seconds for simplicity in this MVP
    const fetchNotifications = async () => {
      try {
        const userId = String(currentUser._id || currentUser.id);
        const res = await fetch(`/api/notifications?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to fetch notifications");
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true })
      });
      setNotifications(notifications.map(n => 
        (n._id === notificationId || n.id === notificationId) ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error("Failed to mark notification as read");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-3 bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 transition flex items-center justify-center"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-gray-900 border border-red-400">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50 rounded-t-xl">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-red-400">{unreadCount} new</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 font-medium">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {notifications.map((n) => (
                    <div 
                      key={String(n._id || n.id)} 
                      className={`p-4 hover:bg-gray-800/50 transition cursor-pointer ${!n.isRead ? 'bg-red-500/5 pr-8 relative' : 'opacity-70'}`}
                      onClick={() => !n.isRead && markAsRead(String(n._id || n.id))}
                    >
                      {!n.isRead && (
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      )}
                      <p className={`text-sm ${!n.isRead ? 'text-red-100 font-semibold' : 'text-gray-300'}`}>{n.title}</p>
                      <p className={`text-xs mt-1 ${!n.isRead ? 'text-gray-300' : 'text-gray-500'}`}>{n.message}</p>
                      <p className="text-[10px] text-gray-500 mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
