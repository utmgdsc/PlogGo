import React, { useState, useEffect, useRef } from "react";
import { View, Button, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

const DEBUG = true; // Set this to false to use real location

const haversine = (coords1, coords2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coords1.latitude * Math.PI) / 180;
  const φ2 = (coords2.latitude * Math.PI) / 180;
  const Δφ = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const Δλ = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export default function SimulatedTracking() {
  const [location, setLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const indexRef = useRef(0);

  const averageStepDistance = 0.8; // In meters

  const simulatedPath = [
    { latitude: 37.78825, longitude: -122.4324 },
    { latitude: 37.78855, longitude: -122.4324 },
    { latitude: 37.78885, longitude: -122.4324 },
    { latitude: 37.78915, longitude: -122.4324 },
    // { latitude: 37.78945, longitude: -122.4324 },
    // { latitude: 37.78975, longitude: -122.4324 },
    // { latitude: 37.79005, longitude: -122.4324 },
    // { latitude: 37.78035, longitude: -122.4324 },
    // { latitude: 37.78965, longitude: -122.4324 },
  ];

  useEffect(() => {
    let intervalId = null;

    if (isTracking) {
      if (DEBUG) {
        console.log("Tracking started in debug mode");

        intervalId = setInterval(() => {
          const currentIndex = indexRef.current;
          
          if (currentIndex < simulatedPath.length) {
            const currentLocation = simulatedPath[currentIndex];
            setLocation(currentLocation);
            setRoute((prev) => [...prev, currentLocation]);

            // Calculate total distance using haversine for each new point
            setTotalDistance((prev) => {
              if (prev === 0) return 0; // Don't calculate if the route is empty
              return prev + haversine(route[route.length - 1], currentLocation);
            });

            indexRef.current += 1;
          } else {
            clearInterval(intervalId);
            setEndTime(Date.now()); // Stop time tracking
          }
        }, 1000);
      }
    } else {
      clearInterval(intervalId);
    }

    return () => clearInterval(intervalId);
  }, [isTracking]);

  const toggleTracking = async () => {
    console.log("Toggling tracking");
    console.log("isTracking", isTracking);
    console.log("route", route);
    console.log("startTime", startTime);
    console.log("endTime", endTime);
    console.log("totalDistance", totalDistance);
    console.log("steps", steps);    
    if (isTracking) {
        const totalDist = route.reduce((acc, _, i) => {
          if (i === 0) return acc;
          return acc + haversine(route[i - 1], route[i]);
        }, 0);
  
        // Set final values for total distance, elapsed time, and steps
        setTotalDistance(totalDist);
        const elapsedTime = (endTime - startTime) / 1000; // Time in seconds
        setSteps(Math.round(totalDist / averageStepDistance)); // Steps based on distance and step length
        console.log("Total distance:", totalDist);
        console.log("Steps:", steps);
        // Send POST request with data to the server after tracking ends
        const data = {
          userid: -1 /* TODO, get user id from JWT TOKEN / local storage*/,
          sessionid: -1, /* TODO, get session id from JWT TOKEN / local storage  */
          routes: route,
          distancesTravelled: totalDist,
          steps: Math.floor(totalDist / averageStepDistance),
          elapsedTime: elapsedTime,
          timeStart: startTime,
          timeEnd: endTime
        };
  
        try {
          const response = await fetch("http://10.0.2.2:5000/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
          if (response.ok) {
            console.log("Data successfully sent to server");
          } else {
            console.log("Error sending data to server");
          }
        } catch (error) {
          console.error("Error with the POST request:", error);
        }
      } else {
      // Start the tracking process
      setStartTime(Date.now()); // Start time tracking
      setRoute([]); // Reset route
      setTotalDistance(0); // Reset distance
      setSteps(0); // Reset steps
      indexRef.current = 0; // Reset index
    }

    setIsTracking(!isTracking);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 10 }}>
        <Text>
          {location
            ? `Latitude: ${location.latitude}, Longitude: ${location.longitude}`
            : "Location not available"}
        </Text>
        {endTime && !isTracking && (
          <>
            <Text>Time Elapsed: {(endTime - startTime) / 1000} seconds</Text>
            <Text>Total Distance: {totalDistance.toFixed(2)} meters</Text>
            <Text>Steps: {steps}</Text>
          </>
        )}
      </View>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {location && <Marker coordinate={location} title="You" />}
        {route.length > 0 && (
          <Polyline coordinates={route} strokeWidth={3} strokeColor="blue" />
        )}
      </MapView>

      <Button
        title={isTracking ? "Stop Tracking" : "Start Tracking"}
        onPress={toggleTracking}
      />
    </View>
  );
}
