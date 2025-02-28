import React, { useState, useEffect, useRef } from "react";
import { View, Button, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function RealTracking() {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const socketRef = useRef(null); // WebSocket reference
  const sessionId = useRef(null); // session ID, initially null

  // hook on mount / unmount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }
    })();

    return () => {
      // Cleanup WebSocket on unmount (if the connection is open)
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const toggleTracking = async () => {
    try {
    console.log("start tracking")
    if (isTracking) {
      console.log("istracking")
      // Stop the WebSocket connection
      if (socketRef.current) {
        // Send end time before closing WebSocket
        const endTimestamp = Date.now();
        socketRef.current.send(
          JSON.stringify({
            type: "end_time",
            sessionId: sessionId.current, // Send session ID along with end time
            endTime: endTimestamp,
          })
        );
        socketRef.current.close();
      }

      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      setEndTime(Date.now()); // Stop time tracking
      // Reset session ID when tracking stops
      sessionId.current = null;

    } else {
      console.log("else")
      // Generate new session ID when tracking starts
      setStartTime(Date.now());
      setLocation(null);
      console.log("opening ws")
      // Open WebSocket connection
      socketRef.current = new WebSocket("ws://10.0.0.188:5000/"); // Replace with actual server WebSocket URL
      console.log("opened ws")
      socketRef.current.onopen = () => {
  
        console.log("WebSocket connection opened");

        // Send JWT token after connection is open
        const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0MDYyNzMxNywianRpIjoiOGZmYWIxMTYtYjk2YS00OGYyLWI0MWUtM2IyZDNiNTY4NDdmIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6ImFAZ21haWwuY29tIiwibmJmIjoxNzQwNjI3MzE3LCJjc3JmIjoiOWRhODNmNTUtMmJhYi00Yzc4LWI4YmEtYjE3ZGQwMjUyMzkzIiwiZXhwIjoxNzQwNjI4MjE3fQ.ENMMEf5SR4oKp9QN401U552cFlh6YOy-gVAYZo5opyk";  // Replace this with your actual JWT token
        socketRef.current.send(
          JSON.stringify({
            type: "authenticate",
            token: token,
            sessionId: sessionId.current,  // Send session ID when WebSocket is opened
          })
        );
       
        // Send the start time when WebSocket opens
        socketRef.current.send(
          JSON.stringify({
            type: "start_time",
            sessionId: sessionId.current,  // Include session ID when sending start time
            startTime: startTime,
          })
        );
      };

      socketRef.current.onerror = (error) => {
        console.log("WebSocket error:", error);
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        // Optionally, send end time when WebSocket closes (if not already sent in the `toggleTracking` function)
        if (!endTime) {
          const endTimestamp = Date.now();
          socketRef.current.send(
            JSON.stringify({
              type: "end_time",
              sessionId: sessionId.current, // Send session ID with end time
              endTime: endTimestamp,
            })
          );
        }
      };

      // Start tracking location
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every 1 meter
        },
        (newLocation) => {
          const coords = newLocation.coords;
          setLocation(coords); // Update current location for the map

          // Send location to WebSocket server with session ID
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                type: "location_update",
                sessionId: sessionId.current,  // Include session ID with location update
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: newLocation.timestamp,
              })
            );
          }
        }
      );

      setLocationSubscription(subscription);
    }

    setIsTracking(!isTracking);
    } catch (error) {
      console.log(error);

    }
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
          </>
        )}
      </View>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location ? location.latitude : 37.78825,
          longitude: location ? location.longitude : -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {location && <Marker coordinate={location} title="You" />}
      </MapView>

      <Button
        title={isTracking ? "Stop Tracking" : "Start Tracking"}
        onPress={toggleTracking}
      />
    </View>
  );
}
