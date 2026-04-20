import React, { useRef, useState } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Image,
    ScrollView,
    SafeAreaView,
} from "react-native";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";

export default function DoctorHandwritingPad() {
    const ref = useRef<SignatureViewRef>(null);   // ✅ correct type
    const [savedImage, setSavedImage] = useState<string | null>(null);
    const [mode, setMode] = useState<"write" | "preview">("write");

    const handleClear = () => ref.current?.clearSignature();
    const handleUndo = () => ref.current?.undo();
    const handleSave = () => ref.current?.readSignature();
    const handleOK = (data: string) => {
        setSavedImage(data);
        setMode("preview");
    };
    const handleError = (err: any) => console.error("Signature error:", err);

    return (
        <SafeAreaView style={styles.container}>
            {mode === "write" ? (
                <>
                    <View style={styles.padContainer}>
                        <SignatureScreen
                            ref={ref}
                            onOK={handleOK}
                            onError={handleError}
                            descriptionText="Write prescription / notes ✍️"
                            penColor="black"
                            webStyle={`
                .m-signature-pad {
                  border: none;
                  box-shadow: none;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                body {
                  background-color: #ffffff;
                  margin: 0;
                  padding: 0;
                }
                canvas {
                  touch-action: none;
                }
              `}
                        />
                    </View>
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.btn} onPress={handleUndo}>
                            <Text style={styles.btnText}>Undo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={handleClear}>
                            <Text style={styles.btnText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <ScrollView contentContainerStyle={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Saved Notes</Text>
                    {savedImage && <Image source={{ uri: savedImage }} style={styles.image} />}
                    <View style={styles.previewButtons}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => setMode("write")}>
                            <Text style={styles.btnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={() => console.log("Submit")}>
                            <Text style={styles.saveText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ... styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f7fa" },
    padContainer: {
        flex: 1,
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e0e0e0",
        minHeight: 300,
    },
    controls: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 12,
    },
    btn: { backgroundColor: "#e5e7eb", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    btnText: { fontWeight: "600", color: "#333" },
    saveBtn: { backgroundColor: "#2e7d74", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    saveText: { color: "#fff", fontWeight: "bold" },
    previewContainer: { padding: 20, alignItems: "center" },
    previewTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
    image: { width: "100%", height: 300, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
    previewButtons: { flexDirection: "row", marginTop: 20, gap: 12 },
    editBtn: { backgroundColor: "#e5e7eb", padding: 12, borderRadius: 8 },
});