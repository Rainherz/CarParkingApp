import { StyleSheet } from "react-native";

export const adminStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    headerIcon: {
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2E7D32",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    timeContainer: {
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    currentTime: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#2E7D32",
        fontFamily: "monospace",
    },
    currentDate: {
        fontSize: 16,
        color: "#666",
        marginTop: 4,
        textTransform: "capitalize",
    },
    actionsContainer: {
        backgroundColor: "#fff",
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    actionButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        borderRadius: 12,
        gap: 6,
    },
    reportButton: {
        backgroundColor: "#1976D2",
    },
    operatorButton: {
        backgroundColor: "#7B1FA2",
    },
    settingsButton: {
        backgroundColor: "#F57C00",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
    statsContainer: {
        backgroundColor: "#fff",
        margin: 16,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    statCard: {
        width: "48%",
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        gap: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    vehiclesContainer: {
        backgroundColor: "#fff",
        margin: 16,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    vehiclesHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    vehicleCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    vehicleInfo: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    plateContainer: {
        backgroundColor: "#2E7D32",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 12,
    },
    plateNumber: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        fontFamily: "monospace",
    },
    vehicleDetails: {
        flex: 1,
    },
    vehicleTime: {
        fontSize: 14,
        color: "#333",
    },
    vehicleDuration: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
    },
});