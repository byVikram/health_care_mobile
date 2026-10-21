import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
} from "react-native";
import SignatureScreen from "react-native-signature-canvas";

type Props = {
  onSave?: (imageData: string) => void;
};

export default function DoctorHandwritingPad({ onSave }: Props) {
  const ref = useRef<any>(null);

  const [savedImage, setSavedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleUndo = () => {
    ref.current?.undo();
  };

  const handleSave = () => {
    ref.current?.readSignature();
  };

  const handleOK = (data: string) => {
    setSavedImage(data);
    setMode("preview");
    onSave?.(data);
  };

  return (
    <View style={styles.container}>
      {mode === "write" ? (
        <>
          {/* SIGNATURE PAD */}
          <View style={styles.padContainer}>
            <SignatureScreen
              ref={ref}
              onOK={handleOK}
              webStyle={signatureStyle}
              descriptionText="Write prescription ✍️"
            />
          </View>

          {/* CONTROLS */}
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
      <View style={styles.previewContainer}>
  <Text style={styles.previewTitle}>Saved Notes</Text>

  {savedImage && (
    <Image source={{ uri: savedImage }} style={styles.image} />
  )}

  <View style={styles.previewButtons}>
    <TouchableOpacity
      style={styles.editBtn}
      onPress={() => setMode("write")}
    >
      <Text style={styles.btnText}>Edit</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.saveBtn}
      onPress={() => {
        if (savedImage) onSave?.(savedImage);
      }}
    >
      <Text style={styles.saveText}>Confirm</Text>
    </TouchableOpacity>
  </View>
</View>
      )}
    </View>
  );
}

const signatureStyle = `
  .m-signature-pad--footer { display: none; margin: 0px; }
  .m-signature-pad { 
    box-shadow: none; 
    border: none;
  }
  body,html {
    height: 100%;
    overflow: hidden;
  }
`;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 8,
  },
  padContainer: {
    height: 280,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  btn: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: "600",
    color: "#333",
  },
  saveBtn: {
    backgroundColor: "#2e7d74",
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
  },
  previewContainer: {
    padding: 12,
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  previewButtons: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  editBtn: {
    backgroundColor: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
  },
});