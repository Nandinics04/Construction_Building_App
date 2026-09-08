import { useSignUp } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const onSignUpPress = async () => {
    const { error } = await signUp.password({
      emailAddress,
      password,
      firstName,
      lastName,
    });

    if (error) {
      Alert.alert('Sign up failed', error.message ?? 'Please try again.');
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      Alert.alert('Verification failed', sendError.message ?? 'Could not send the verification code.');
      return;
    }

    setPendingVerification(true);
  };

  const onVerifyPress = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      Alert.alert('Verification failed', error.message ?? 'Invalid code. Please try again.');
      return;
    }

    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: () => router.replace('/(app)/home'),
      });
    }
  };

  return (
    <ImageBackground source={require('../../../assets/images/projectwall.png')} style={styles.container}>
      <View style={styles.backgroundOverlay} />
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.appNameText}>ConneX</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.accountContainer}>
            <Text style={styles.accountText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.signUpHeaderText}>Sign up</Text>

          {!pendingVerification ? (
            <>
              <Text style={styles.inputLabel}>Enter your first name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Enter your last name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Enter your email address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={emailAddress}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmailAddress}
                />
              </View>

              <Text style={styles.inputLabel}>Create a password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {errors?.fields?.emailAddress ? (
                <Text style={styles.errorText}>{errors.fields.emailAddress.message}</Text>
              ) : null}
              {errors?.fields?.password ? (
                <Text style={styles.errorText}>{errors.fields.password.message}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  !firstName || !lastName || !emailAddress || !password ? styles.buttonDisabled : null,
                ]}
                onPress={onSignUpPress}
                disabled={!firstName || !lastName || !emailAddress || !password || fetchStatus === 'fetching'}
              >
                <Text style={styles.buttonText}>
                  {fetchStatus === 'fetching' ? 'Creating account...' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.verificationText}>Please check your email for a verification code.</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Verification Code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
              </View>
              {errors?.fields?.code ? (
                <Text style={styles.errorText}>{errors.fields.code.message}</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.button, !code ? styles.buttonDisabled : null]}
                onPress={onVerifyPress}
                disabled={!code || fetchStatus === 'fetching'}
              >
                <Text style={styles.buttonText}>
                  {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify Email'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'white',
    opacity: 0.4,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  appNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 32,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  accountText: {
    color: '#666',
    fontSize: 14,
  },
  signInLink: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpHeaderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  errorText: {
    color: '#D00000',
    fontSize: 13,
    marginTop: 8,
  },
});
