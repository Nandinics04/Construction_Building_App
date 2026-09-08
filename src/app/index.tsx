import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.logoText}>ConneX</Text>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/construction.png')}
            style={styles.constructionImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={() => router.push('/screens/SignInScreen')}>
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
    justifyContent: 'space-between',
    paddingTop: isSmallDevice ? height * 0.03 : height * 0.05,
    paddingBottom: height * 0.04,
  },
  headerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: isSmallDevice ? 16 : 18,
    color: '#000000',
    fontWeight: '400',
  },
  logoText: {
    fontSize: isSmallDevice ? 32 : 38,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.5,
    marginTop: -5,
  },
  imageContainer: {
    flex: 1.2,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: height * 0.02,
  },
  constructionImage: {
    width: width * 0.95,
    height: height * 0.5,
    maxHeight: 500,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: width * 0.04,
  },
  button: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: isSmallDevice ? 16 : 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
