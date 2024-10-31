import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';
import { useCallback, useEffect, useRef, useState } from 'react';

import { StatusBar } from 'expo-status-bar';
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


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);
    
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [sleepStatus, setSleepStatus] = useState<number | undefined>();
  const [statement, setStatement] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
  });


   useEffect(() => {
    async function prepare() {
      try {
        // Any additional setup like API calls
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);


  const hasSubscribed = useRef(false); // Ref to track if subscription has been done

  const fetchSleepStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://sleepbubble-server-production.up.railway.app/sleepstatus");
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
      const response = await fetch("https://sleepbubble-server-production.up.railway.app/join", {
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
      const response = await fetch("https://sleepbubble-server-production.up.railway.app/updatesleep", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: sleepStateValue,
      });

      if (response.status === 304)
      { 
        setErrorMessage(`Lennox is already ${sleepStatus === 1 ? "sleeping" : "awake" }!`);
      }
        
      else if (!response.ok) {
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

  if (!appIsReady || !fontsLoaded) {
    return <ActivityIndicator size="large" color="#003366" />;
  }

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={onLayoutRootView}>
           <StatusBar style="dark" />
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
               <TouchableOpacity onPress={()=> ToggleSleepStatus(false)}>
            <Text style={[styles.switchLabel, { color: textColor, fontFamily: 'FredokaOne_400Regular', opacity: sleepStatus === 0 ? 1 : 0.2 }]}>
              {"Awake"}
              </Text>
              </TouchableOpacity>
            <Switch
              value={sleepStatus === 1 ? true : false}
              onValueChange={() => ToggleSleepStatus(sleepStatus === 1 ? false : true)}
              thumbColor={sleepStatus === 1 ? "#FFC107" : "#00509E"}
              trackColor={{ false: "#FFC107", true: "#00509E" }}
              style={styles.largeSwitch}
              />
             <TouchableOpacity onPress={()=> ToggleSleepStatus(true)}>
                <Text style={[styles.switchLabel, { color: textColor, fontFamily: 'FredokaOne_400Regular', opacity: sleepStatus === 1 ? 1 : 0.2 }]}>
                  {"Sleeping"}
                </Text>
              </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={fetchSleepStatus} style={styles.refreshButton}>
            <Text style={[styles.refreshText, { fontFamily: 'FredokaOne_400Regular' }]}>Refresh</Text>
            </TouchableOpacity>
            <Text style={styles.errorText}>{errorMessage ? errorMessage : ""}</Text>
        </>
      )}
    </View>
  )
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
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    position: 'absolute',
    bottom: 50,
    color: 'red',
    fontSize: 12,
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
    fontSize: 16, // Bubbly yet readable
    fontWeight: '400',
  },
});