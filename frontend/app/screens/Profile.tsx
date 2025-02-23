import { Text, View } from "react-native";

export default function Profile() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>This is the Profile Page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: '#ffffff',
  },
  profile: {
    alignItems: "center",
  },
  pfp: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  description: {
    fontSize: 16,
    color: "gray",
  },
  editProfile: {
    fontFamily: 'Poppins-Bold',
    borderRadius: 20,
    padding: 5,
    paddingHorizontal: 35,
    marginTop: 12,
    backgroundColor: '#1dff06',
    color: 'white',
    width: '80%',
    textAlign: 'center',
    fontSize: 12,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  badges: {
    width: "80%",
    height: "40%",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgesTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    alignSelf: "flex-start",
  },
  badgeContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  badgeItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  badgeCircle: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeText: {
    fontFamily: 'Poppins-Light',
    marginTop: 10, // Increased space between badge and title
    fontSize: 12,
    color: '#1dff06',
  },
  streak: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "80%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  streakTextContainer: {
    flexDirection: "row",
    alignItems: "center", // Align items to the center vertically
  },
  streakCount: {
    
    fontSize: 32,
  },
  streakDays: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: "#555",
    marginTop: 8, // Move "Streak days" slightly below the center
  },
  streakEmoji: {
    fontSize: 30,
  },
});