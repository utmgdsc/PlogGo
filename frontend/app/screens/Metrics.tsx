import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, TextInput, StatusBar, Alert, ScrollView, Keyboard, TouchableWithoutFeedback} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { API_URL, API_ROUTES } from '../config/env';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useFocusEffect } from '@react-navigation/native';

SplashScreen.preventAutoHideAsync();

export default function Metrics() {
  const [progress, setProgress] = useState({ Steps: 0, Distance: 0, Time: 0, Calories: 0, Litter: 0, Curr_Streak: 0});
  const [selectedOption, setSelectedOption] = useState<'Steps' | 'Distance'>('Steps');
  const currentProgress = progress[selectedOption as 'Steps' | 'Distance'];
  const { authState } = useAuth();
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [distanceGoal, setDistanceGoal] = useState(500);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [tempStepsGoal, setTempStepsGoal] = useState('');
  const [tempDistanceGoal, setTempDistanceGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stepPercent, setStepPercent] = useState(0);
  const [distancePercent, setDistancePercent] = useState(0);
  const metrics = {
    Steps: {
      icon: 'footsteps' as 'footsteps',
      unit: 'steps',
      goal: stepsGoal,
      percent: stepPercent.toFixed(2),
      current: progress.Steps,
      color: '#4CAF50'
    },
    Distance: {
      icon: 'walk' as 'walk',
      unit: 'km',
      goal: distanceGoal,
      percent: distancePercent.toFixed(2),
      current: progress.Distance,
      color: '#2196F3'
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      return () => {
        // Clean up function when screen loses focus (if needed)
      };
    }, [])
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log(`${API_URL}${API_ROUTES.METRICS}`);
      const response = await axios.get(`${API_URL}${API_ROUTES.METRICS}`);
      console.log(response.data);

      const Steps = response.data.steps;
      const Distance = response.data.distance.toFixed(2);
      const Time = Math.floor(response.data.time / 60);
      const Calories = Math.floor(response.data.calories);
      const Litter = response.data.litter;
      const Curr_Streak = response.data.curr_streak;
      setProgress({ Steps, Distance, Time, Calories, Litter, Curr_Streak });

      // set goals
      console.log(response.data.stepgoals, response.data.distancegoals);
      setStepsGoal(response.data.stepgoals);
      setDistanceGoal(response.data.distancegoals);

      // set percentages
      const stepPercent = (Steps / response.data.stepgoals) * 100;
      const distancePercent = (Distance / response.data.distancegoals) * 100;
      setStepPercent(stepPercent);
      setDistancePercent(distancePercent);
    } catch (error) {
      console.log(error);
    }
  };

  const openSettingsModal = () => {
    setTempStepsGoal(stepsGoal.toString());
    setTempDistanceGoal(distanceGoal.toString());
    setSettingsModalVisible(true);
  };

  const saveGoals = async () => {
    try {
      const newStepsGoal = parseInt(tempStepsGoal, 10);
      const newDistanceGoal = parseInt(tempDistanceGoal, 10);
      
      // Validate inputs
      if (isNaN(newStepsGoal) || isNaN(newDistanceGoal)) {
        Alert.alert("Invalid Input", "Please enter valid numbers for your goals.");
        return;
      }
      
      if (newStepsGoal <= 0 || newDistanceGoal <= 0) {
        Alert.alert("Invalid Goals", "Goals must be greater than zero.");
        return;
      }
      
      setIsLoading(true);
      
      // Send updated goals to the API
      console.log(`${API_URL}${API_ROUTES.GOALS}`);
      const response = await axios.post(`${API_URL}${API_ROUTES.GOALS}`, {
        stepGoal: newStepsGoal,
        distanceGoal: newDistanceGoal
      });
      
      // Update local state with new goals
      setStepsGoal(newStepsGoal);
      setDistanceGoal(newDistanceGoal);
      
      // Close the modal
      setSettingsModalVisible(false);
      
      // Refresh data to get updated metrics
      fetchData();
      
      Alert.alert("Success", "Your fitness goals have been updated!");
    } catch (error) {
      console.error("Failed to update goals:", error);
      Alert.alert("Error", "Failed to update goals. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const [loaded, error] = useFonts({
    'Poppins-Black': require('../../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettingsModal}>
          <Ionicons name="settings-outline" size={24} color="#555" />
        </TouchableOpacity>
      </View>
      
      {/* Segmented Control - Fixed */}
      <View style={styles.segmentedControlContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedOption === 'Steps' && styles.activeSegment,
            ]}
            onPress={() => setSelectedOption('Steps')}
          >
            <Ionicons 
              name="footsteps-outline" 
              size={18} 
              color={selectedOption === 'Steps' ? '#fff' : '#555'} 
            />
            <Text
              style={[
                styles.segmentText,
                selectedOption === 'Steps' && styles.activeSegmentText,
              ]}
            >
              Steps
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedOption === 'Distance' && styles.activeSegment,
            ]}
            onPress={() => setSelectedOption('Distance')}
          >
            <Ionicons 
              name="walk-outline" 
              size={18} 
              color={selectedOption === 'Distance' ? '#fff' : '#555'} 
            />
            <Text
              style={[
                styles.segmentText,
                selectedOption === 'Distance' && styles.activeSegmentText,
              ]}
            >
              Distance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <AnimatedCircularProgress
              size={220}
              width={18}
              rotation={0}
              backgroundWidth={8}
              fill={Number(metrics[selectedOption].percent)}
              tintColor={metrics[selectedOption].color}
              backgroundColor="#E8F5E9"
              lineCap="round"
              duration={1000}
            >
              {() => (
                <View style={styles.progressContent}>
                  <Ionicons 
                    name={metrics[selectedOption].icon} 
                    size={48} 
                    color={metrics[selectedOption].color} 
                    style={styles.progressIcon}
                  />
                  <Text style={styles.progressValue}>
                    {metrics[selectedOption].current}
                  </Text>
                  <Text style={styles.progressUnit}>
                    {metrics[selectedOption].unit}
                  </Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>
          
          {/* Progress Details */}
          <View style={styles.progressDetails}>
            <View style={styles.progressDetailItem}>
              <Text style={styles.progressDetailLabel}>Goal</Text>
              <Text style={styles.progressDetailValue}>
                {metrics[selectedOption].goal} {metrics[selectedOption].unit}
              </Text>
            </View>
            <View style={styles.progressDetailDivider} />
            <View style={styles.progressDetailItem}>
              <Text style={styles.progressDetailLabel}>Completed</Text>
              <Text style={[styles.progressDetailValue, {color: metrics[selectedOption].color}]}>
                {metrics[selectedOption].percent}%
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Activity Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.summaryCards}>
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="time-outline" size={28} color="#4CAF50" />
              <Text style={styles.summaryValue}>{progress.Time} mins</Text>
              <Text style={styles.summaryLabel}>Active Time</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['#E3F2FD', '#BBDEFB']}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome6 name="fire-flame-curved" size={28} color="#2196F3" />
              <Text style={styles.summaryValue}>{Math.floor(progress.Calories)}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Total Metrics</Text>
          <View style={styles.summaryCards}>
            <LinearGradient
              colors={['#E3F2FD', '#BBDEFB']}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome5 name="coins" size={28} color="#2196F3" />
              <Text style={styles.summaryValue}>{progress.Curr_Streak}</Text>
              <Text style={styles.summaryLabel}>Total Points</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome6 name="trash-can" size={28} color="#4CAF50" />
              <Text style={styles.summaryValue}>{progress.Litter}</Text>
              <Text style={styles.summaryLabel}>Trash Collected</Text>
            </LinearGradient>
          </View>
        </View>
        
        {/* Additional Metrics
        <View style={styles.additionalSection}>
          <Text style={styles.sectionTitle}>Monthly Progress</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>+15%</Text>
                <Text style={styles.statLabel}>vs. Last Month</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#2196F3" />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>Achievements</Text>
              </View>
            </View>
          </View>
        </View> */}
        
        {/* Spacing at the bottom for better scrolling */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      <Modal
  animationType="slide"
  transparent={true}
  visible={settingsModalVisible}
  onRequestClose={() => setSettingsModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modalContainer}>
      <TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fitness Goals</Text>
              <TouchableOpacity 
                onPress={() => setSettingsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="footsteps-outline" size={20} color="#4CAF50" />
                  <Text style={styles.inputLabel}>Steps Goal</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={tempStepsGoal}
                  onChangeText={setTempStepsGoal}
                  keyboardType="numeric"
                  placeholder="Enter daily steps goal"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="walk-outline" size={20} color="#2196F3" />
                  <Text style={styles.inputLabel}>Distance Goal (km)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={tempDistanceGoal}
                  onChangeText={setTempDistanceGoal}
                  keyboardType="numeric"
                  placeholder="Enter daily distance goal"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveGoals}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save Goals"}
              </Text>
            </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  segmentedControlContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  activeSegment: {
    backgroundColor: '#4CAF50',
  },
  segmentText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#555',
  },
  activeSegmentText: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  progressSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressIcon: {
    marginBottom: 8,
  },
  progressValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 36,
    color: '#333',
    lineHeight: 42,
  },
  progressUnit: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: '#666',
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  progressDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressDetailLabel: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  progressDetailValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#333',
  },
  progressDetailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  summarySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 14,
    color: '#666',
  },
  weeklySection: {
    marginBottom: 30,
  },
  goalContainer: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalText: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  goalValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#333',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  additionalSection: {
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  statInfo: {
    marginLeft: 12,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#333',
  },
  statLabel: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 12,
    color: '#666',
  },
  bottomSpacing: {
    height: 30,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});