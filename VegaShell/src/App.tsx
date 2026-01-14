import React, {useState} from 'react';
import {StyleSheet, Text, ImageBackground, View, Image} from 'react-native';
import {Link} from './components/Link';

const images = {
  vega: require('./assets/vega.png'),
  learn: require('./assets/learn.png'),
  support: require('./assets/support.png'),
  build: require('./assets/build.png'),
};

export const App = () => {
  const [image, setImage] = useState(images.vega);

  const styles = getStyles();

  return (
    <ImageBackground
      source={require('./assets/background.png')}
      style={styles.background}>
      <View style={styles.container}>
        <View style={styles.links}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Hello World!</Text>
            <Text style={styles.subHeaderText}>
              Select one of the options below to start your Vega journey 🚀
            </Text>
          </View>
          <Link
            linkText={'Learn'}
            onPress={() => {
              setImage(images.learn);
            }}
            testID="sampleLink"
          />
          <Link
            linkText={'Build'}
            onPress={() => {
              setImage(images.build);
            }}
          />
          <Link
            linkText={'Support'}
            onPress={() => {
              setImage(images.support);
            }}
          />
        </View>
        <View style={styles.image}>
          <Image source={image} />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          💡 Edit App.tsx to change this screen and then come back to see your
          edits
        </Text>
      </View>
    </ImageBackground>
  );
};

const getStyles = () =>
  StyleSheet.create({
    background: {
      color: 'white',
      flex: 1,
      flexDirection: 'column',
    },
    container: {
      flex: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerContainer: {
      marginLeft: 200,
    },
    headerText: {
      color: 'white',
      fontSize: 80,
      marginBottom: 10,
    },
    subHeaderText: {
      color: 'white',
      fontSize: 40,
    },
    links: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-around',
      height: 600,
    },
    image: {
      flex: 1,
      paddingLeft: 150,
    },
    textContainer: {
      justifyContent: 'center',
      flex: 1,
      marginLeft: 190,
    },
    text: {
      color: 'white',
      fontSize: 40,
    },
  });
