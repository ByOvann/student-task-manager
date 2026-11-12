
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TaskCardProps = {
  title: string;
  description: string;
  status: "Selesai" | "Belum selesai";
  category?: string;
  priority?: "Rendah" | "Sedang" | "Tinggi";
  deadline?: string;
};

export default function TaskCard({
  title,
  description,
  status,
  category = "Pribadi",
  priority = "Sedang",
  deadline = "-",
}: TaskCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, slideY]);

  const priorityColor =
    priority === "Tinggi"
      ? "#DC2626"
      : priority === "Sedang"
      ? "#D97706"
      : "#059669";

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY: slideY }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            status === "Selesai" ? styles.completed : styles.pending,
          ]}
        >
          <Text style={styles.statusText}>
            {status === "Selesai" ? "Selesai" : "Aktif"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="folder-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}>{category}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="flag-outline"
            size={14}
            color={priorityColor}
          />
          <Text style={[styles.infoText, { color: priorityColor }]}>
            {priority}
          </Text>
        </View>
      </View>

      <View style={styles.deadlineRow}>
        <Ionicons name="calendar-outline" size={14} color="#64748B" />
        <Text style={styles.deadlineText}>
          Deadline: {deadline === "-" ? "Belum ditentukan" : deadline}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAECF2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172033",
  },
  description: {
    fontSize: 12,
    color: "#7B8497",
    marginTop: 6,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completed: {
    backgroundColor: "#DCFCE7",
  },
  pending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F1F5",
    marginVertical: 13,
  },
  infoRow: {
    flexDirection: "row",
    gap: 18,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  deadlineText: {
    fontSize: 11,
    color: "#64748B",
  },
});
