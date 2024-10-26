import * as Notifications from 'expo-notifications';

import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';
import { useEffect, useRef, useState } from 'react';

import registerForPushNotificationsAsync from '@/utils/registerForPushNotificationsAsync';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface SleepStatusResponse {
  sleepStatus: string;
  statement: string;
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const [sleepStatus, setSleepStatus] = useState<number | undefined>();
  const [statement, setStatement] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  let [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
  });

  const [isFontLoaded, setIsFontLoaded] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      setIsFontLoaded(true);
    }
  }, [fontsLoaded]);

  const hasSubscribed = useRef(false); // Ref to track if subscription has been done

  const fetchSleepStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://192.168.1.42:3000/");
      if (response.ok) {
        const data: SleepStatusResponse = await response.json();
        setSleepStatus(Number(data.sleepStatus));
        setStatement(data.statement);
      } else {
        setErrorMessage("Failed to fetch sleep status");
      }
    } catch (err: any) {
      setErrorMessage("Error getting Lennox's sleep status: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSleepStatus();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setErrorMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [errorMessage]);

  async function SubscribeToGoServer(token: string) {
    if (hasSubscribed.current) return; // Only subscribe once
    hasSubscribed.current = true;

    try {
      const response = await fetch("http://192.168.1.42:3000/join", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: token,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      console.log("Successfully subscribed to Go server");
    } catch (err) {
      console.error("Error in subscribe to Go server:", err);
    }
  }

  async function ToggleSleepStatus(newSleepState: boolean) {
    const sleepStateValue = newSleepState ? "1" : "0";
    try {
      const response = await fetch("http://192.168.1.42:3000/updateSleep", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: sleepStateValue,
      });

      if (!response.ok) {
        setErrorMessage("Failed to toggle sleep status");
      } else {
        await fetchSleepStatus(); // Refresh the state from server as the source of truth
      }
    } catch (err: any) {
      setErrorMessage("Error toggling sleep status: " + err.message);
    }
  }

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token ?? '');
        SubscribeToGoServer(token ?? '');
      })
      .catch((error) => console.error("Push notification registration error:", error));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const backgroundColor = sleepStatus === 1 ? '#111B35' : '#98C1E2';
  const textColor = sleepStatus === 1 ? '#FFFFFF' : '#003366';

  if (!isFontLoaded) {
    return <ActivityIndicator size="large" color="#003366" />;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#003366" />
      ) : (
        <>
          <View style={styles.messageContainer}>
            <Text style={[styles.titleText, { color: textColor, fontFamily: 'FredokaOne_400Regular' }]}>
              {notification?.request.content.title}
            </Text>
            <Text style={[styles.bodyText, { color: textColor, fontFamily: 'FredokaOne_400Regular' }]}>
              {notification ? notification.request.content.body : statement}
            </Text>
          </View>
          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, { color: textColor, fontFamily: 'FredokaOne_400Regular' }]}>
              {sleepStatus === 1 ? "Sleeping" : "Awake"}
            </Text>
            <Switch
              value={sleepStatus === 1}
              onValueChange={ToggleSleepStatus}
              thumbColor={sleepStatus === 1 ? "#FFC107" : "#00509E"}
              trackColor={{ false: "#98C1E2", true: "#111B35" }}
              style={styles.largeSwitch}
            />
          </View>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <TouchableOpacity onPress={fetchSleepStatus} style={styles.refreshButton}>
            <Text style={[styles.refreshText, { fontFamily: 'FredokaOne_400Regular' }]}>Refresh</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 24, // Moderate size for readability
    fontWeight: '600',
    marginBottom: 25,
  },
  bodyText: {
    fontSize: 20, // Moderate size for readability
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  switchContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  switchLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  largeSwitch: {
    transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }],
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#00509E',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 20, // Bubbly yet readable
    fontWeight: '600',
  },
});