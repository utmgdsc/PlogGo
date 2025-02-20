import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Camera as ExpoCamera } from "expo-camera";

export default function Camera() {
  const [borderColor, setBorderColor] = useState("green");
  const [photo, setPhoto] = useState(null);

  const takePhoto = () => {
    // Toggle border color between green and red
    setBorderColor(prevColor => (prevColor === "green" ? "red" : "green"));
    
    // Simulate taking a photo with a placeholder image
    //setPhoto("https://via.placeholder.com/300");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.previewContainer, { borderColor }]}> 
        {photo ? (
          <Image source={{ uri: photo }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewText}>No photo taken yet</Text>
        )}
      </View>
      <TouchableOpacity style={styles.captureButton} onPress={takePhoto} activeOpacity={0.7}>
        <View style={styles.innerCircle}></View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: "80%",
    height: "60%",
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 5,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewText: {
    color: "#aaa",
    fontSize: 18,
  },
  captureButton: {
    marginTop: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  innerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#d9d9d9",
  }
});
