import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress, AnimatedCircularProgress } from 'react-native-circular-progress';
import { useFonts } from "expo-font";
import AppLoading from "expo-app-loading";

export default function Index() {
  // top banner will have title and settings icon,
  // middle will have banner with two selections, steps or litter
  // then will have a circular progress bar for the selected metric

  // TODO: run api call for percentage
  const progressValues: { [key in 'Steps' | 'Litter']: number } = {
    Steps: 50,
    Litter: 75,
  }
  const progressIcons: { [key in 'Steps' | 'Litter']: string } = {
    Steps: 'walk',
    Litter: 'trash',
  }
  const smallProgressValues = {
    Steps: 60, // Example progress for smaller bar 1
    Litter: 40, // Example progress for smaller bar 2
  };
  const [selectedOption, setSelectedOption] = useState<'Steps' | 'Litter'>('Steps');
  const currentProgress = progressValues[selectedOption];

  let [fontsLoaded] = useFonts({
    'Roboto': require('../assets/fonts/Roboto-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  return (
    <View style={styles.container}>
      {/* Banner: Steps or Litter Selection */}
      <View style={styles.banner}>
        <TouchableOpacity
          style={[
            styles.bannerButton,
            selectedOption === 'Steps' && styles.selectedBannerButton,
          ]}
          onPress={() => setSelectedOption('Steps')}
        >
          <Text
            style={[
              styles.bannerText,
              selectedOption === 'Steps' && styles.selectedBannerText,
            ]}
          >
            Steps
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bannerButton,
            selectedOption === 'Litter' && styles.selectedBannerButton,
          ]}
          onPress={() => setSelectedOption('Litter')}
        >
          <Text
            style={[
              styles.bannerText,
              selectedOption === 'Litter' && styles.selectedBannerText,
            ]}
          >
            Litter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Circular Progress Bar */}
      <View style={styles.progressContainer}>
        <AnimatedCircularProgress
          size={250}
          width={15}
          rotation={0}
          fill={currentProgress} // Constant value for progress
          tintColor="#37eb34"
          backgroundColor="#e0e0e0"
        >
          {() => (
            <Ionicons name={progressIcons[selectedOption] as 'walk' | 'trash'} size={170} color="#0096FF" />
          )}
        </AnimatedCircularProgress>

        <Text style={styles.specialText}>{`${currentProgress}%`}</Text>
        <Text style={styles.text}>{`Completed!`}</Text>
      </View>
      {/* Bottom: Extra Data, two horizontal progress bars */}
      {/* Two Smaller Circular Progress Bars */}
      <View style={styles.smallProgressContainer}>
        <View style={styles.smallProgressWrapper}>
          <AnimatedCircularProgress
            size={120}
            width={10}
            rotation={0}
            fill={currentProgress} // Progress for the first smaller bar
            tintColor="#37eb34"
            backgroundColor="#e0e0e0"
          >
            {() => (
              <Ionicons name="cafe-outline" size={40} color="#000" />
            )}
          </AnimatedCircularProgress>
          <Text style={styles.smallProgressLabel}>Example Metric 1</Text>
        </View>
        <View style={styles.smallProgressWrapper}>
          <AnimatedCircularProgress
            size={120}
            width={10}
            rotation={0}
            fill={currentProgress} // Progress for the second smaller bar
            tintColor="#37eb34"
            backgroundColor="#e0e0e0"
          >
            {() => (
              // display icon for litter
              <Ionicons name="bug-outline" size={40} color="#000" />
            )}
          </AnimatedCircularProgress>
          <Text style={styles.smallProgressLabel}>Example Metric 2</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  specialText:{
    fontFamily: 'Roboto',
    fontSize: 30,
    color: '#FFBF00',
    marginTop: 10,
    padding: 10,
    fontWeight: 'bold',
  },
  text: {
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#000',
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 200,
    padding: 10,
    
  },
  bannerButton: {
    padding: 10,
    borderRadius: 15,
    flex: 1,
    alignItems: 'center',
  },
  selectedBannerButton: {
    backgroundColor: '#37eb34',
  },
  bannerText: {
    fontSize: 16,
    color: '#000',
  },
  selectedBannerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  progressText: {
    fontSize: 30,
    color: '#000',
  },
  smallProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  smallProgressWrapper: {
    alignItems: 'center',
  },
  smallProgressText: {
    fontSize: 20,
    color: '#000',
  },
  smallProgressLabel: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
});

