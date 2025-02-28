import { useState, useEffect, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';  // Import MediaLibrary for saving photos

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();  // Camera permission
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false); // Media Library permission
  const [scale] = useState(new Animated.Value(1)); // Animation for blinking effect
  const cameraRef = useRef<any>(null); // Ref for CameraView

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
      // Capture the photo
      const photo = await cameraRef.current.takePictureAsync();
      const response = await fetch('http://192.168.1.100:5000/store-litter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // For sending JSON data
        },
        body: JSON.stringify({
          image: photo.base64, // Send the Base64-encoded image
        }),
      });

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

    
    }
  };


  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale }] }]} // Apply scale animation
    >
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
});
