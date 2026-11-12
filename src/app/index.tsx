
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  useRef,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import TaskCard from "../components/TaskCard";
import {
  requestNotificationPermission,
  scheduleTaskReminder,
  sendTestNotification,
} from "../utils/notifications";

// ==========================================
// 1. TYPE DAN KONFIGURASI
// ==========================================

type Task = {
  id: number;
  title: string;
  description: string;
  status: "Selesai" | "Belum selesai";
  category: "Kuliah" | "Pribadi" | "Pekerjaan";
  priority: "Rendah" | "Sedang" | "Tinggi";
  deadline: string;
};

type Action =
  | { type: "ADD_TASK"; payload: Task }
  | { type: "EDIT_TASK"; payload: Task }
  | { type: "TOGGLE_TASK"; payload: number }
  | { type: "DELETE_TASK"; payload: number }
  | { type: "SET_TASKS"; payload: Task[] };

type Tab = "Home" | "Tasks" | "Analytics" | "Settings";
type StatusFilter = "Semua" | "Belum selesai" | "Selesai";

const STORAGE_KEY = "student_tasks";

const COLORS = {
  background: "#F7F8FC",
  primary: "#4F46E5",
  dark: "#172033",
  muted: "#7B8497",
  border: "#EAECF2",
  white: "#FFFFFF",
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Mengerjakan tugas React Native",
    description: "Menyelesaikan tugas pertemuan 5",
    status: "Belum selesai",
    category: "Kuliah",
    priority: "Tinggi",
    deadline: "2026-11-20",
  },
  {
    id: 2,
    title: "Belajar JavaScript",
    description: "Memahami dasar React Hooks",
    status: "Selesai",
    category: "Kuliah",
    priority: "Sedang",
    deadline: "2026-11-15",
  },
  {
    id: 3,
    title: "Membuat laporan kuliah",
    description: "Menyusun laporan praktikum",
    status: "Belum selesai",
    category: "Kuliah",
    priority: "Rendah",
    deadline: "2026-11-25",
  },
];

// ==========================================
// 2. REDUCER
// ==========================================

function taskReducer(state: Task[], action: Action): Task[] {
  switch (action.type) {
    case "ADD_TASK":
      return [action.payload, ...state];

    case "EDIT_TASK":
      return state.map((task) =>
        task.id === action.payload.id ? action.payload : task
      );

    case "TOGGLE_TASK":
      return state.map((task) =>
        task.id === action.payload
          ? {
              ...task,
              status:
                task.status === "Selesai"
                  ? "Belum selesai"
                  : "Selesai",
            }
          : task
      );

    case "DELETE_TASK":
      return state.filter((task) => task.id !== action.payload);

    case "SET_TASKS":
      return action.payload;

    default:
      return state;
  }
}

// ==========================================
// 3. HELPER
// ==========================================

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDeadlineStatus(deadline: string) {
  if (!deadline || deadline === "-") {
    return {
      label: "Tanpa deadline",
      color: "#64748B",
      background: "#F1F5F9",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${deadline}T00:00:00`);
  const difference = Math.ceil(
    (dueDate.getTime() - today.getTime()) / 86400000
  );

  if (difference < 0) {
    return {
      label: "Terlambat",
      color: "#DC2626",
      background: "#FEE2E2",
    };
  }

  if (difference === 0) {
    return {
      label: "Deadline hari ini",
      color: "#D97706",
      background: "#FEF3C7",
    };
  }

  if (difference <= 3) {
    return {
      label: `${difference} hari lagi`,
      color: "#D97706",
      background: "#FEF3C7",
    };
  }

  return {
    label: "Masih tersedia",
    color: "#059669",
    background: "#DCFCE7",
  };
}

// ==========================================
// 4. KOMPONEN DONUT CHART
// ==========================================

function DonutChart({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const size = 150;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : completed / total;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8EAF3"
          strokeWidth={strokeWidth}
          fill="none"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.chartCenter}>
        <Text style={styles.chartPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.chartLabel}>Selesai</Text>
      </View>
    </View>
  );
}

// ==========================================
// 5. KOMPONEN PILIHAN
// ==========================================

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.choiceRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.choice,
              value === option && styles.choiceActive,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                value === option && styles.choiceTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ==========================================
// 6. MAIN APPLICATION
// ==========================================

export default function Index() {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] =
    useState<"Kuliah" | "Pribadi" | "Pekerjaan">("Kuliah");
  const [newPriority, setNewPriority] =
    useState<"Rendah" | "Sedang" | "Tinggi">("Sedang");
  const [newDeadline, setNewDeadline] = useState("");

  // Edit task
  const [editingId, setEditingId] = useState<number | null>(null);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Search dan filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Semua");

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  // Notification
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  const titleInputRef = useRef<TextInput>(null);
  const headerAnimation = useRef(new Animated.Value(0)).current;

  // ==========================================
  // 7. LOAD DATA ASYNC STORAGE
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem(STORAGE_KEY);

        if (!mounted) return;

        if (savedTasks !== null) {
          const parsed = JSON.parse(savedTasks);

          if (Array.isArray(parsed)) {
            dispatch({
              type: "SET_TASKS",
              payload: parsed,
            });
          }
        }
      } catch (error) {
        console.error("Gagal membaca data:", error);
        Alert.alert(
          "Peringatan",
          "Data tugas sebelumnya tidak dapat dibaca."
        );
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // 8. SAVE DATA ASYNC STORAGE
  // ==========================================

  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(
      (error) => {
        console.error("Gagal menyimpan data:", error);
      }
    );
  }, [tasks, isLoaded]);

  // ==========================================
  // 9. CHECK NOTIFICATION PERMISSION
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();

        if (mounted) {
          setNotificationsEnabled(permission.granted);
        }
      } catch (error) {
        console.error("Gagal memeriksa izin notifikasi:", error);
      }
    };

    checkPermission();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // 10. SYNC TASK REMINDERS
  // ==========================================

  useEffect(() => {
    if (!isLoaded || !notificationsEnabled) return;

    let cancelled = false;

    const syncReminders = async () => {
      try {
        // Ambil seluruh notifikasi yang sudah dijadwalkan.
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();

        // Batalkan notifikasi lama milik task manager.
        for (const notification of scheduled) {
          if (notification.content.data?.taskId !== undefined) {
            await Notifications.cancelScheduledNotificationAsync(
              notification.identifier
            );
          }
        }

        // Jadwalkan ulang tugas yang belum selesai.
        for (const task of tasks) {
          if (cancelled) return;

          if (
            task.status === "Belum selesai" &&
            task.deadline !== "-"
          ) {
            await scheduleTaskReminder(
              task.id,
              task.title,
              task.deadline
            );
          }
        }
      } catch (error) {
        console.error("Gagal menyinkronkan pengingat:", error);
      }
    };

    syncReminders();

    return () => {
      cancelled = true;
    };
  }, [tasks, isLoaded, notificationsEnabled]);

  // ==========================================
  // 11. ANIMATION
  // ==========================================

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnimation]);

  // ==========================================
  // 12. SUMMARY
  // ==========================================

  const summary = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.filter(
      (task) => task.status === "Selesai"
    ).length;

    return {
      total,
      completed,
      pending: total - completed,
      progress: total === 0 ? 0 : completed / total,
    };
  }, [tasks]);

  // ==========================================
  // 13. FILTER TASK
  // ==========================================

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "Semua" || task.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [tasks, search, filter]);

  // ==========================================
  // 14. OVERDUE TASK
  // ==========================================

  const overdueTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        task.status === "Belum selesai" &&
        getDeadlineStatus(task.deadline).label === "Terlambat"
    );
  }, [tasks]);

  // ==========================================
  // 15. FORM HANDLERS
  // ==========================================

  const resetForm = () => {
    setNewTask("");
    setNewDescription("");
    setNewCategory("Kuliah");
    setNewPriority("Sedang");
    setNewDeadline("");
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setActiveTab("Tasks");
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  const openEditForm = (task: Task) => {
    setEditingId(task.id);
    setNewTask(task.title);
    setNewDescription(task.description);
    setNewCategory(task.category);
    setNewPriority(task.priority);
    setNewDeadline(task.deadline === "-" ? "" : task.deadline);

    if (task.deadline && task.deadline !== "-") {
      setPickerDate(new Date(`${task.deadline}T00:00:00`));
    } else {
      setPickerDate(new Date());
    }

    setActiveTab("Tasks");
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  // ==========================================
  // 16. ADD / EDIT TASK
  // ==========================================

  const saveTask = useCallback(() => {
    const cleanTitle = newTask.trim();

    if (!cleanTitle) {
      Alert.alert("Perhatian", "Judul tugas tidak boleh kosong.");
      return;
    }

    if (cleanTitle.length > 80) {
      Alert.alert(
        "Judul terlalu panjang",
        "Judul tugas maksimal 80 karakter."
      );
      return;
    }

    if (newDescription.trim().length > 300) {
      Alert.alert(
        "Deskripsi terlalu panjang",
        "Deskripsi maksimal 300 karakter."
      );
      return;
    }

    if (
      newDeadline &&
      !/^\d{4}-\d{2}-\d{2}$/.test(newDeadline)
    ) {
      Alert.alert("Tanggal tidak valid", "Periksa tanggal deadline.");
      return;
    }

    const existingTask = tasks.find(
      (item) => item.id === editingId
    );

    const task: Task = {
      id: editingId ?? Date.now(),
      title: cleanTitle,
      description: newDescription.trim() || "Tidak ada deskripsi",
      status: existingTask?.status ?? "Belum selesai",
      category: newCategory,
      priority: newPriority,
      deadline: newDeadline || "-",
    };

    if (editingId !== null) {
      dispatch({ type: "EDIT_TASK", payload: task });
      Alert.alert("Berhasil", "Tugas berhasil diperbarui.");
    } else {
      dispatch({ type: "ADD_TASK", payload: task });
      Alert.alert("Berhasil", "Tugas berhasil ditambahkan.");
    }

    resetForm();
    setActiveTab("Tasks");
  }, [
    newTask,
    newDescription,
    newCategory,
    newPriority,
    newDeadline,
    editingId,
    tasks,
  ]);

  // ==========================================
  // 17. TOGGLE TASK
  // ==========================================

  const toggleTask = useCallback((id: number) => {
    dispatch({ type: "TOGGLE_TASK", payload: id });
  }, []);

  // ==========================================
  // 18. DELETE TASK
  // ==========================================

  const deleteTask = useCallback((id: number) => {
    Alert.alert(
      "Hapus tugas",
      "Yakin ingin menghapus tugas ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "DELETE_TASK", payload: id });
          },
        },
      ]
    );
  }, []);

  // ==========================================
  // 19. DATE PICKER
  // ==========================================

  const openCalendar = () => {
    setPickerDate(
      newDeadline
        ? new Date(`${newDeadline}T00:00:00`)
        : new Date()
    );

    setShowDatePicker(true);
  };

  const handleDateChange = (
    _event: any,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setPickerDate(selectedDate);
      setNewDeadline(formatDate(selectedDate));
    }
  };

  // ==========================================
  // 20. NOTIFICATION HANDLERS
  // ==========================================

  const enableNotifications = async () => {
    if (notificationBusy) return;

    setNotificationBusy(true);

    try {
      const granted = await requestNotificationPermission();

      setNotificationsEnabled(granted);

      if (granted) {
        Alert.alert(
          "Berhasil",
          "Izin notifikasi berhasil diaktifkan. Pengingat tugas akan dijadwalkan otomatis."
        );
      } else {
        Alert.alert(
          "Izin belum diberikan",
          "Silakan aktifkan izin notifikasi melalui pengaturan perangkat."
        );
      }
    } catch (error) {
      console.error("Gagal mengaktifkan notifikasi:", error);

      Alert.alert(
        "Terjadi kesalahan",
        "Notifikasi tidak dapat diaktifkan."
      );
    } finally {
      setNotificationBusy(false);
    }
  };

  const testNotification = async () => {
    if (!notificationsEnabled) {
      Alert.alert(
        "Notifikasi belum aktif",
        "Aktifkan izin notifikasi terlebih dahulu."
      );
      return;
    }

    try {
      await sendTestNotification();

      Alert.alert(
        "Notifikasi dijadwalkan",
        "Notifikasi percobaan akan muncul sekitar 5 detik lagi."
      );
    } catch (error) {
      console.error("Gagal mengirim tes notifikasi:", error);

      Alert.alert(
        "Gagal",
        "Notifikasi percobaan tidak dapat dijadwalkan."
      );
    }
  };

  // ==========================================
  // 21. TASK ITEM
  // ==========================================

  const TaskItem = ({ task }: { task: Task }) => {
    const deadlineStatus = getDeadlineStatus(task.deadline);

    return (
      <View style={styles.taskWrapper}>
        <TaskCard
          title={task.title}
          description={task.description}
          status={task.status}
          category={task.category}
          priority={task.priority}
          deadline={task.deadline}
        />

        <View style={styles.deadlineStatusRow}>
          <View
            style={[
              styles.deadlineBadge,
              { backgroundColor: deadlineStatus.background },
            ]}
          >
            <Text
              style={[
                styles.deadlineBadgeText,
                { color: deadlineStatus.color },
              ]}
            >
              {deadlineStatus.label}
            </Text>
          </View>
        </View>

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleTask(task.id)}
          >
            <Ionicons
              name={
                task.status === "Selesai"
                  ? "arrow-undo-outline"
                  : "checkmark-circle-outline"
              }
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.actionText}>
              {task.status === "Selesai"
                ? "Batalkan"
                : "Selesaikan"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditForm(task)}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color="#2563EB"
            />
            <Text style={[styles.actionText, { color: "#2563EB" }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteTask(task.id)}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color="#DC2626"
            />
            <Text style={styles.deleteText}>Hapus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==========================================
  // 22. TASK FORM
  // ==========================================

  const TaskForm = () => (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <SectionTitle>
          {editingId !== null
            ? "Edit tugas"
            : "Tambah tugas baru"}
        </SectionTitle>

        {editingId !== null && (
          <TouchableOpacity onPress={resetForm}>
            <Text style={styles.cancelEdit}>Batal edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.fieldLabel}>Judul tugas</Text>

      <TextInput
        ref={titleInputRef}
        style={styles.input}
        placeholder="Masukkan judul tugas"
        placeholderTextColor="#A0A6B5"
        value={newTask}
        onChangeText={setNewTask}
        maxLength={80}
      />

      <Text style={styles.fieldLabel}>Deskripsi</Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tambahkan deskripsi tugas"
        placeholderTextColor="#A0A6B5"
        value={newDescription}
        onChangeText={setNewDescription}
        multiline
        maxLength={300}
      />

      <ChoiceGroup
        label="Kategori"
        options={["Kuliah", "Pribadi", "Pekerjaan"]}
        value={newCategory}
        onChange={(value) =>
          setNewCategory(value as Task["category"])
        }
      />

      <ChoiceGroup
        label="Prioritas"
        options={["Rendah", "Sedang", "Tinggi"]}
        value={newPriority}
        onChange={(value) =>
          setNewPriority(value as Task["priority"])
        }
      />

      <Text style={styles.fieldLabel}>Deadline</Text>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={openCalendar}
      >
        <Ionicons
          name="calendar-outline"
          size={19}
          color={COLORS.primary}
        />

        <Text style={styles.dateButtonText}>
          {newDeadline || "Pilih tanggal deadline"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display={
              Platform.OS === "ios" ? "spinner" : "calendar"
            }
            onChange={handleDateChange}
          />

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.dateConfirmButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.dateConfirmText}>
                Selesai
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {newDeadline !== "" && (
        <TouchableOpacity
          onPress={() => setNewDeadline("")}
          style={styles.clearDate}
        >
          <Text style={styles.clearDateText}>
            Hapus deadline
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={saveTask}
      >
        <Ionicons
          name={
            editingId !== null
              ? "save-outline"
              : "add-circle-outline"
          }
          size={18}
          color="#FFFFFF"
        />

        <Text style={styles.primaryButtonText}>
          {editingId !== null
            ? "Simpan Perubahan"
            : "Tambahkan Tugas"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // 23. HOME SCREEN
  // ==========================================

  const HomeScreen = () => (
    <>
      <Animated.View
        style={{
          opacity: headerAnimation,
          transform: [
            {
              translateY: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0],
              }),
            },
          ],
        }}
      >
        <Text style={styles.greeting}>Selamat datang 👋</Text>
        <Text style={styles.heading}>Task Manager</Text>
        <Text style={styles.subtitle}>
          Atur tugas dan selesaikan satu per satu.
        </Text>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons
            name="clipboard-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.statNumber}>
            {summary.total}
          </Text>
          <Text style={styles.statLabel}>Total tugas</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color="#059669"
          />
          <Text style={[styles.statNumber, { color: "#059669" }]}>
            {summary.completed}
          </Text>
          <Text style={styles.statLabel}>Selesai</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons
            name="time-outline"
            size={20}
            color="#D97706"
          />
          <Text style={[styles.statNumber, { color: "#D97706" }]}>
            {summary.pending}
          </Text>
          <Text style={styles.statLabel}>Belum selesai</Text>
        </View>
      </View>

      {overdueTasks.length > 0 && (
        <View style={styles.warningCard}>
          <Ionicons
            name="alert-circle"
            size={22}
            color="#DC2626"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>
              {overdueTasks.length} tugas melewati deadline
            </Text>

            <Text style={styles.warningText}>
              Periksa dan selesaikan tugas yang terlambat.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <SectionTitle>Progress tugas</SectionTitle>

        <DonutChart
          completed={summary.completed}
          total={summary.total}
        />

        <Text style={styles.centerText}>
          {summary.completed} dari {summary.total} tugas selesai
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <SectionTitle>Tugas terbaru</SectionTitle>

        <TouchableOpacity onPress={() => setActiveTab("Tasks")}>
          <Text style={styles.seeAll}>Lihat semua</Text>
        </TouchableOpacity>
      </View>

      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada tugas.</Text>
      ) : (
        tasks.slice(0, 3).map((task) => (
          <TaskItem key={task.id} task={task} />
        ))
      )}

      <TouchableOpacity
        style={styles.addShortcut}
        onPress={openAddForm}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.addShortcutText}>
          Tambah tugas baru
        </Text>
      </TouchableOpacity>
    </>
  );

  // ==========================================
  // 24. TASKS SCREEN
  // ==========================================

  const TasksScreen = () => (
    <>
      <Text style={styles.heading}>Daftar Tugas</Text>

      <Text style={styles.subtitle}>
        Cari, filter, dan kelola semua tugasmu.
      </Text>

      <TaskForm />

      <View style={styles.card}>
        <SectionTitle>Cari tugas</SectionTitle>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={19}
            color="#94A3B8"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Cari judul atau deskripsi..."
            placeholderTextColor="#A0A6B5"
            value={search}
            onChangeText={setSearch}
          />

          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.fieldLabel}>Filter status</Text>

        <View style={styles.choiceRow}>
          {(
            ["Semua", "Belum selesai", "Selesai"] as StatusFilter[]
          ).map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              style={[
                styles.choice,
                filter === item && styles.choiceActive,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  filter === item && styles.choiceTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionTitle>
        Hasil pencarian ({filteredTasks.length})
      </SectionTitle>

      {filteredTasks.length === 0 ? (
        <Text style={styles.emptyText}>
          Tidak ada tugas yang sesuai.
        </Text>
      ) : (
        filteredTasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))
      )}
    </>
  );

  // ==========================================
  // 25. ANALYTICS SCREEN
  // ==========================================

  const AnalyticsScreen = () => (
    <>
      <Text style={styles.heading}>Analitik</Text>

      <Text style={styles.subtitle}>
        Lihat perkembangan penyelesaian tugas.
      </Text>

      <View style={styles.card}>
        <SectionTitle>Progress keseluruhan</SectionTitle>

        <DonutChart
          completed={summary.completed}
          total={summary.total}
        />

        <Text style={styles.centerText}>
          {Math.round(summary.progress * 100)}% tugas telah selesai
        </Text>
      </View>

      <View style={styles.card}>
        <SectionTitle>Ringkasan tugas</SectionTitle>

        {[
          ["Total tugas", summary.total],
          ["Selesai", summary.completed],
          ["Belum selesai", summary.pending],
          ["Terlambat", overdueTasks.length],
        ].map(([label, value]) => (
          <View key={String(label)} style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>
              {label}
            </Text>
            <Text style={styles.analyticsValue}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SectionTitle>Prioritas tugas</SectionTitle>

        {(["Tinggi", "Sedang", "Rendah"] as const).map(
          (priority) => {
            const count = tasks.filter(
              (task) => task.priority === priority
            ).length;

            return (
              <View key={priority} style={styles.analyticsRow}>
                <Text style={styles.analyticsLabel}>
                  {priority}
                </Text>
                <Text style={styles.analyticsValue}>
                  {count}
                </Text>
              </View>
            );
          }
        )}
      </View>
    </>
  );

  // ==========================================
  // 26. SETTINGS SCREEN
  // ==========================================

  const SettingsScreen = () => (
    <>
      <Text style={styles.heading}>Pengaturan</Text>

      <Text style={styles.subtitle}>
        Pengaturan dan informasi aplikasi.
      </Text>

      <View style={styles.card}>
        <View style={styles.settingsIcon}>
          <Ionicons
            name="calendar-outline"
            size={28}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.settingsTitle}>
          Student Task Manager
        </Text>

        <Text style={styles.settingsText}>
          Aplikasi untuk membantu mahasiswa mengatur aktivitas
          dan tugas sehari-hari.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.settingsText}>
          Versi aplikasi: 1.0.0
        </Text>
        <Text style={styles.settingsText}>
          Platform: React Native
        </Text>
        <Text style={styles.settingsText}>
          Framework: Expo
        </Text>
        <Text style={styles.settingsText}>
          Penyimpanan: AsyncStorage
        </Text>
      </View>

      <View style={styles.card}>
        <SectionTitle>Pengingat tugas</SectionTitle>

        <View style={styles.notificationStatus}>
          <Ionicons
            name={
              notificationsEnabled
                ? "notifications"
                : "notifications-off-outline"
            }
            size={22}
            color={
              notificationsEnabled
                ? "#059669"
                : "#D97706"
            }
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.notificationTitle}>
              {notificationsEnabled
                ? "Notifikasi aktif"
                : "Notifikasi belum aktif"}
            </Text>

            <Text style={styles.notificationDescription}>
              {notificationsEnabled
                ? "Pengingat tugas dijadwalkan satu hari sebelum deadline."
                : "Aktifkan notifikasi untuk menerima pengingat tugas."}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={enableNotifications}
          disabled={notificationBusy}
        >
          {notificationBusy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="notifications-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                {notificationsEnabled
                  ? "Periksa Izin Notifikasi"
                  : "Aktifkan Notifikasi"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: "#059669" },
          ]}
          onPress={testNotification}
        >
          <Ionicons
            name="paper-plane-outline"
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.primaryButtonText}>
            Tes Notifikasi
          </Text>
        </TouchableOpacity>

        <Text style={styles.notificationNote}>
          Pengingat dijadwalkan pukul 09.00 sehari sebelum
          deadline. Tugas tanpa deadline atau yang sudah selesai
          tidak mendapat pengingat.
        </Text>
      </View>
    </>
  );

  // ==========================================
  // 27. NAVIGATION
  // ==========================================

  const renderScreen = () => {
    switch (activeTab) {
      case "Home":
        return <HomeScreen />;

      case "Tasks":
        return <TasksScreen />;

      case "Analytics":
        return <AnalyticsScreen />;

      case "Settings":
        return <SettingsScreen />;

      default:
        return <HomeScreen />;
    }
  };

  const navItems: {
    label: Tab;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Home", icon: "home-outline" },
    { label: "Tasks", icon: "list-outline" },
    { label: "Analytics", icon: "stats-chart-outline" },
    { label: "Settings", icon: "settings-outline" },
  ];

  // ==========================================
  // 28. LOADING SCREEN
  // ==========================================

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.loadingText}>
          Memuat data tugas...
        </Text>
      </View>
    );
  }

  // ==========================================
  // 29. MAIN RENDER
  // ==========================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderScreen()}
      </ScrollView>

      <View style={styles.bottomNav}>
        {navItems.map((item) => {
          const active = activeTab === item.label;

          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => setActiveTab(item.label)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={
                  active ? COLORS.primary : "#9AA1B2"
                }
              />

              <Text
                style={[
                  styles.navLabel,
                  active && styles.navActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 30. STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.muted,
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: COLORS.dark,
    marginTop: 5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 7,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 17,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 17,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: 150,
    height: 150,
    marginVertical: 8,
  },
  chartCenter: {
    position: "absolute",
    alignItems: "center",
  },
  chartPercentage: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.dark,
  },
  chartLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  centerText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
  },
  field: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 7,
  },
  textArea: {
    minHeight: 75,
    textAlignVertical: "top",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  choice: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "#F1F2F7",
  },
  choiceActive: {
    backgroundColor: COLORS.primary,
  },
  choiceText: {
    fontSize: 11,
    color: "#626B7D",
    fontWeight: "600",
  },
  choiceTextActive: {
    color: COLORS.white,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelEdit: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8F9FC",
    padding: 13,
    borderRadius: 11,
  },
  dateButtonText: {
    flex: 1,
    color: COLORS.dark,
    fontSize: 13,
  },
  datePickerContainer: {
    backgroundColor: "#F8F9FC",
    borderRadius: 12,
    marginTop: 10,
    overflow: "hidden",
  },
  dateConfirmButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    alignItems: "center",
  },
  dateConfirmText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  clearDate: {
    alignSelf: "flex-end",
    marginTop: 9,
  },
  clearDateText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 17,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  taskWrapper: {
    marginBottom: 8,
  },
  deadlineStatusRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: -5,
    marginBottom: 9,
  },
  deadlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  deadlineBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 7,
    marginTop: -3,
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  deleteText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.dark,
    fontSize: 13,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    padding: 20,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F5",
  },
  analyticsLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  analyticsValue: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 13,
  },
  warningCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 17,
  },
  warningTitle: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 13,
  },
  warningText: {
    color: "#991B1B",
    fontSize: 11,
    marginTop: 4,
  },
  addShortcut: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  addShortcutText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  settingsIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  settingsTitle: {
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 9,
  },
  settingsText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 7,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  notificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  notificationTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 13,
  },
  notificationDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 17,
  },
  notificationNote: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 13,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    color: "#9AA1B2",
    marginTop: 4,
  },
  navActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
});
