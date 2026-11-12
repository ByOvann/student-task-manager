
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "task-reminders",
        {
          name: "Pengingat Tugas",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4F46E5",
        }
      );
    }

    const current =
      await Notifications.getPermissionsAsync();

    if (current.granted) return true;

    const requested =
      await Notifications.requestPermissionsAsync();

    return requested.granted;
  } catch (error) {
    console.error("Izin notifikasi gagal:", error);
    return false;
  }
}

export async function scheduleTaskReminder(
  taskId: number,
  title: string,
  deadline: string
): Promise<string | null> {
  try {
    if (!deadline || deadline === "-") return null;

    const reminderDate = new Date(`${deadline}T09:00:00`);

    // Pengingat satu hari sebelum deadline.
    reminderDate.setDate(reminderDate.getDate() - 1);

    // Jangan jadwalkan waktu yang sudah lewat.
    if (reminderDate.getTime() <= Date.now()) {
      return null;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pengingat Tugas",
        body: `Besok deadline tugas: ${title}`,
        sound: true,
        data: { taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        ...(Platform.OS === "android"
          ? { channelId: "task-reminders" }
          : {}),
      },
    });
  } catch (error) {
    console.error("Gagal menjadwalkan pengingat:", error);
    return null;
  }
}

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Student Task Manager",
      body: "Notifikasi berhasil diaktifkan. Jangan lupa kerjakan tugasmu!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(Platform.OS === "android"
        ? { channelId: "task-reminders" }
        : {}),
    },
  });
}
