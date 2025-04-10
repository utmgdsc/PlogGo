import React, { useState, useEffect, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Animated, Image, Alert, StatusBar, Platform, Modal } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { API_URL, API_ROUTES } from '../config/env';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Define navigation type
type RootStackParamList = {
  MainTabs: undefined;
  Camera: undefined;
  Tracking: undefined;
};

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;

export default function Camera() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false);
  const [scale] = useState(new Animated.Value(1));
  const cameraRef = useRef<any>(null);
  const { onLogout, getToken, authState } = useAuth();
  const { updateMetrics, sessionId } = useTracking();
  
  // New state variables
  const [photo, setPhoto] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');

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

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
        navigation.navigate('MainTabs');
      } else {
        console.error('Logout function is not available');
        Alert.alert('Error', 'Logout functionality is not available.');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

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

  const toggleFlash = () => {
    setFlashMode(current => 
      current === 'off' ? 'on' : 'off'
    );
  };

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
      
      // Check if user is authenticated
      if (!authState?.authenticated) {
        Alert.alert("Authentication Error", "You need to be logged in to upload photos.");
        return;
      }
      
      // Get authentication token
      const token = await getToken?.();
      
      if (!token) {
        throw new Error("Authentication token is missing");
      }
      
      // Make API call to detect litter
      console.log("Making request to:", `${API_URL}${API_ROUTES.LITTER_CLASSIFICATION}`);
      console.log("Current sessionId:", sessionId);
      
      // Include sessionId in the request if available
      const requestBody = { 
        image: photo.base64,
        ...(sessionId ? { sessionId } : {})
      };
      
      const response = await axios.post(
        `${API_URL}${API_ROUTES.LITTER_CLASSIFICATION}`, 
        requestBody,
        { 
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = response.data;
      console.log("API response:", JSON.stringify(data));
      
      // Check if we received a response (even if it's empty)
      if (data) {
        // Initialize variables with defaults in case fields are missing
        const litterCounts: Record<string, number> = data.litters || {};
        const points = data.points || 0;
        const totalLitterCount = Object.values(litterCounts).reduce((sum, count) => sum + count, 0);
        
        if (totalLitterCount > 0) {
          // Display individual litter counts if any were found
          for (const [litterType, count] of Object.entries(litterCounts)) {
            Alert.alert(
              "Litter Found",
              `Found ${count} ${litterType}${count > 1 ? 's' : ''}`,
              [{ text: "OK" }]
            );
          }
          
          // Check if the challenge was to collect 2 bottles
          let challengeCompleted = false;
          let challengeMessage = "";
          if (litterCounts.bottle && litterCounts.bottle >= 2) {
            challengeCompleted = true;
            challengeMessage = "🎉 Challenge Completed! You've collected 2 bottles today!";
          }
          
          // Display points and challenge status
          Alert.alert(
            challengeCompleted ? "Challenge Completed!" : "Points Earned",
            challengeCompleted 
              ? `${challengeMessage}\nTotal Points: ${points}`
              : `Total Points: ${points}`,
            [{ text: "OK" }]
          );
        } else {
          // No litter found
          Alert.alert("No Litter Detected", "No litter was detected in this image.", [{ text: "OK" }]);
        }
        
        // Update metrics in tracking context
        updateMetrics({
          litters: totalLitterCount,
          points: points,
          litterDetails: litterCounts
        });
        
        // Add a short delay before navigating back to allow context to update
        setTimeout(() => {
          // Hide confirmation screen
          setShowConfirmation(false);
          setPhoto(null);
          
          // Navigate back to tracking screen
          navigation.goBack();
        }, 500);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      
      // Enhanced error reporting
      let errorMessage = "Failed to process the image. Please try again.";
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        if (axios.isAxiosError(error) && error.response) {
          console.error("Server response:", error.response.data);
          errorMessage = `Server error: ${error.response.status}. ${error.response.data.message || ''}`;
        }
      }
      
      Alert.alert(
        "Error",
        errorMessage,
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

  const goBackToTracking = () => {
    navigation.goBack(); // Navigate back to Tracking screen
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[styles.cameraContainer, { transform: [{ scale }] }]}
      >
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
        >
          <View style={styles.overlay}>
            {/* Top Controls */}
            <View style={styles.topControls}>
              <View style={styles.leftControls}>
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={goBackToTracking}
                >
                  <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.middleControls}>
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={28} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.rightControls}>
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={toggleFlash}
                >
                  <Ionicons 
                    name={flashMode === 'on' ? "flash" : "flash-outline"} 
                    size={28} 
                    color="white" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePhoto} 
                activeOpacity={0.7}
              >
                <View style={styles.captureButtonInner}>
                  <View style={styles.captureButtonCenter} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </Animated.View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Photo</Text>
              <Text style={styles.modalSubtitle}>Is this photo clear enough?</Text>
            </View>
            
            {photo && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.previewImage}
                />
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Ionicons name="close" size={24} color="#FF3B30" />
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.acceptButton]} 
                onPress={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.modalButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color="white" />
                    <Text style={styles.modalButtonText}>Use Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  leftControls: {
    flexDirection: 'row',
  },
  middleControls: {
    flexDirection: 'row',
  },
  rightControls: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sideControls: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -50 }],
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Poppins-Light',
  },
  previewContainer: {
    width: '100%',
    height: 350,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  modalButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },
  cancelButtonText: {
    color: '#FF3B30',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    padding: 20,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
});