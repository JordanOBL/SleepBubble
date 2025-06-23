# SleepBubble

SleepBubble is a simple React Native application built with [Expo](https://expo.dev). It allows you to toggle and view a sleep status, sending push notifications whenever the status changes.

## Features

- Toggle between **Sleeping** and **Awake** states
- Fetch and display the current sleep status from the SleepBubble server
- Receive push notifications using Expo Notifications
- Works on Android, iOS and the web

## Installation

1. Install dependencies
   ```bash
   npm install
   ```
2. Start the development server
   ```bash
   npx expo start
   ```
   Follow the prompts in your terminal to open the app on a simulator, emulator or physical device.

## Project Structure

```
app/              # Application source
  (tabs)/index.tsx
assets/           # Images and fonts
constants/        # Shared constants such as colors
utils/            # Helper utilities
```

## Learn More

See the [Expo documentation](https://docs.expo.dev/) for guides on building, testing and deploying your app.

## License

This project is licensed under the MIT License.
