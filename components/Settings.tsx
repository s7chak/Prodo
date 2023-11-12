import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

function SettingScreen({isDarkMode}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.header, isDarkMode && styles.headerDark]}>Settings</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '20%',
    marginTop: '5%',
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    paddingBottom: 20,
  },
  headerDark: {
    color: 'white',
  },
});

export default SettingScreen;
