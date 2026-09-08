import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stage, setStage] = useState<'email' | 'code' | 'newPassword'>('email');
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const onRequestReset = async () => {
    const { error: createError } = await signIn.create({ identifier: emailAddress });
    if (createError) {
      Alert.alert('Error', createError.message ?? 'Failed to start password reset.');
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      Alert.alert('Error', error.message ?? 'Failed to send reset code. Please try again.');
      return;
    }

    setStage('code');
    setSuccessMessage('Check your email for the reset code');
  };

  const onVerifyCode = async () => {
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) {
      Alert.alert('Error', error.message ?? 'Invalid code. Please try again.');
      return;
    }

    setStage('newPassword');
    setSuccessMessage('Enter your new password');
  };

  const onResetPassword = async () => {
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });

    if (error) {
      Alert.alert('Error', error.message ?? 'Failed to reset password. Please try again.');
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: () => router.replace('/(app)/home'),
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}
      </View>

      <View style={styles.inputContainer}>
        {stage === 'email' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors?.fields?.identifier ? (
              <Text style={styles.errorText}>{errors.fields.identifier.message}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.button, !emailAddress ? styles.buttonDisabled : null]}
              onPress={onRequestReset}
              disabled={!emailAddress || fetchStatus === 'fetching'}
            >
              <Text style={styles.buttonText}>
                {fetchStatus === 'fetching' ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {stage === 'code' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Reset Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            {errors?.fields?.code ? (
              <Text style={styles.errorText}>{errors.fields.code.message}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.button, !code ? styles.buttonDisabled : null]}
              onPress={onVerifyCode}
              disabled={!code || fetchStatus === 'fetching'}
            >
              <Text style={styles.buttonText}>
                {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {stage === 'newPassword' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors?.fields?.password ? (
              <Text style={styles.errorText}>{errors.fields.password.message}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.button, !password ? styles.buttonDisabled : null]}
              onPress={onResetPassword}
              disabled={!password || fetchStatus === 'fetching'}
            >
              <Text style={styles.buttonText}>
                {fetchStatus === 'fetching' ? 'Saving...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    color: '#4CAF50',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  inputContainer: {
    gap: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#D00000',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
