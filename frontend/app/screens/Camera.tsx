import { useState, useEffect, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Animated, Image, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { API_URL } from '../context/AuthContext';
import axios from 'axios';

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false);
  const [scale] = useState(new Animated.Value(1));
  const cameraRef = useRef<any>(null);
  
  // New state variables
  const [photo, setPhoto] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Request Media Library permission
  useEffect(() => {
    const requestMediaPermission = async () => {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        setMediaLibraryPermission(true);
      } else {
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        setMediaLibraryPermission(newStatus === 'granted');
      }
    };
    requestMediaPermission();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        // Capture the photo - make sure exif is included and quality is specified
        const photoData = await cameraRef.current.takePictureAsync({
          base64: true,
          exif: true,
          quality: 0.8,
          skipProcessing: false  // Important to ensure processing completes
        });
        
        console.log("Photo captured:", photoData.uri);

        // Animate the blinking effect
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.005,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Set the photo state and show confirmation
        setPhoto(photoData);
        setShowConfirmation(true);
      } catch (error) {
        console.error("Error taking photo:", error);
        Alert.alert("Error", "Failed to capture photo. Please try again.");
      }
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (!photo || !photo.base64) {
        throw new Error("Photo data is missing");
      }
      console.log("Sending photo to server..."+`${API_URL}/store-litter` );
      const response = await axios.post(`${API_URL}/store-litter`, { image: photo.base64})
      const data = await response.data;
      console.log("get",data);
      
      // Show result in a popup notification
      // result structure: {"points":10, "litter":{"can":1, "bottle":2}}
      // iterate through litter object to display each item
      // finally display the total points
      if (data) {
        Alert.alert(
          "Final Points",
          `${data.points}`,
          [{ text: "OK" }]
        );
        for (const [key, value] of Object.entries(data.litters)) {
          Alert.alert(
            "Result",
            `Found ${value} ${key}(s)`,
            [{ text: "OK" }]
          );
        }
       
        // Hide confirmation screen
        setShowConfirmation(false);
        setPhoto(null);
      }
    } catch (error) {
      console.error("Error sending photo:", error);
      Alert.alert(
        "Error",
        "Failed to process the image. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset states and allow user to take another photo
    setShowConfirmation(false);
    setPhoto(null);
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale }] }]}
    >
      {!showConfirmation ? (
        // Camera view
        <>
          <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                <Text style={styles.text}>Flip Camera</Text>
              </TouchableOpacity>
            </View>
          </CameraView>

          <TouchableOpacity style={styles.captureButton} onPress={takePhoto} activeOpacity={0.7}>
            <View style={styles.innerCircle}></View>
          </TouchableOpacity>
        </>
      ) : (
        // Confirmation view
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationTitle}>Use this photo?</Text>
          
          {photo && (
            <Image
              source={{ uri: photo.uri }}
              style={styles.previewImage}
            />
          )}
          
          <View style={styles.confirmationButtons}>
            <TouchableOpacity 
              style={[styles.confirmButton, styles.cancelButton]} 
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, styles.acceptButton]} 
              onPress={handleConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? "Processing..." : "Use Photo"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  button: {
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    left: '50%',
    transform: [{ translateX: -35 }],
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  innerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#d9d9d9',
  },
  // New styles for confirmation screen
  confirmationContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '70%',
    borderRadius: 10,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
  },
  acceptButton: {
    backgroundColor: '#34c759',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});