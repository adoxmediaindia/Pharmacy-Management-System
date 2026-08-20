import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ApiClient } from '@/services/api-client';
import { useTheme } from '@/hooks/use-theme';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolView } from 'expo-symbols';

export default function CreateOrderScreen() {
  const theme = useTheme();
  
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [prescriptionAttached, setPrescriptionAttached] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!doctorName.trim()) newErrors.doctorName = 'Doctor name is required';
    if (!address.trim()) newErrors.address = 'Delivery address is required';
    if (!contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    if (!scheduleDateTime.trim()) newErrors.scheduleDateTime = 'Delivery schedule date/time is required';
    if (!prescriptionAttached) newErrors.prescription = 'Please attach a prescription image';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMockUpload = () => {
    setLoading(true);
    setTimeout(() => {
      setPrescriptionAttached(true);
      setLoading(false);
      setErrors((prev) => ({ ...prev, prescription: '' }));
      Alert.alert('Prescription Uploaded', 'Mock prescription attached successfully.');
    }, 800);
  };

  const formatScheduledDateTime = (input: string): string => {
    const trimmed = input.trim();
    
    // Support formats like YYYY-MM-DD HH:MM AM/PM, YYYY-MM-DD HH:MMAM/PM, YYYY-MM-DD / HH(AM/PM), etc.
    const regex = /^(\d{4}-\d{2}-\d{2})(?:\s*[/]\s*|\s+)(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm|Am|Pm)$/;
    const match = trimmed.match(regex);
    
    if (match) {
      const [, datePart, hourPart, minutePart, ampmPart] = match;
      let hour = parseInt(hourPart, 10);
      const minutes = minutePart ? parseInt(minutePart, 10) : 0;
      const ampm = ampmPart.toUpperCase();
      
      if (hour < 1 || hour > 12) {
        throw new Error('Hour must be between 1 and 12 for AM/PM format.');
      }
      if (minutes < 0 || minutes > 59) {
        throw new Error('Minutes must be between 0 and 59.');
      }
      
      if (ampm === 'PM' && hour < 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Construct in local timezone
      const localDate = new Date(year, month - 1, day, hour, minutes, 0, 0);
      if (isNaN(localDate.getTime())) {
        throw new Error('Invalid date components.');
      }
      return localDate.toISOString();
    }
    
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    throw new Error('Please use YYYY-MM-DD HH:MM AM/PM or YYYY-MM-DD / HH(AM/PM) format.');
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let formattedDateString;
      try {
        formattedDateString = formatScheduledDateTime(scheduleDateTime);
      } catch (parseErr: any) {
        Alert.alert('Invalid Date Format', parseErr.message || 'Please use YYYY-MM-DD / HH(AM/PM) format.');
        setLoading(false);
        return;
      }

      const payload = {
        patientName: patientName.trim(),
        doctorName: doctorName.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        scheduledDateTime: formattedDateString,
        prescriptionUrl: 'https://example.com/mock-prescription.jpg',
      };

      console.log('[DEBUG-FRONTEND] CreateOrder: payload scheduledDateTime =', payload.scheduledDateTime, 'type =', typeof payload.scheduledDateTime);

      const response = await ApiClient.post('/orders', payload);

      if (response && response.success) {
        Alert.alert(
          'Order Created',
          `New order ${response.order?.id || ''} has been successfully created and sent to the billing queue!`,
          [{ text: 'OK', onPress: () => router.replace('/dashboard') }]
        );
      } else {
        Alert.alert('Submission Failed', response.error || 'Failed to create the order. Please try again.');
      }
    } catch (err: any) {
      console.error('Submit order error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      Alert.alert(
        'Error',
        err.message || 'An unexpected error occurred while connecting to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ title: 'Create Order' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card bordered style={styles.formCard}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Patient Information</Text>
          
          <TextInput
            label="Patient Full Name"
            placeholder="e.g. John Doe"
            value={patientName}
            onChangeText={(val) => {
              setPatientName(val);
              if (errors.patientName) setErrors((prev) => ({ ...prev, patientName: '' }));
            }}
            error={errors.patientName}
          />

          <TextInput
            label="Doctor Name"
            placeholder="e.g. Dr. Sarah Smith"
            value={doctorName}
            onChangeText={(val) => {
              setDoctorName(val);
              if (errors.doctorName) setErrors((prev) => ({ ...prev, doctorName: '' }));
            }}
            error={errors.doctorName}
          />

          <TextInput
            label="Contact Number"
            placeholder="e.g. +1 555-0199"
            value={contactNumber}
            onChangeText={(val) => {
              setContactNumber(val);
              if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: '' }));
            }}
            keyboardType="phone-pad"
            error={errors.contactNumber}
          />

          <TextInput
            label="Delivery Address"
            placeholder="Street address, building, flat number"
            value={address}
            onChangeText={(val) => {
              setAddress(val);
              if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
            }}
            multiline
            numberOfLines={3}
            error={errors.address}
          />

          <TextInput
            label="Schedule Delivery Date / Time"
            placeholder="e.g. 2026-08-14 10:00 AM"
            value={scheduleDateTime}
            onChangeText={(val) => {
              setScheduleDateTime(val);
              if (errors.scheduleDateTime) setErrors((prev) => ({ ...prev, scheduleDateTime: '' }));
            }}
            error={errors.scheduleDateTime}
          />

          {/* Prescription Upload Mock */}
          <Text style={[styles.uploadLabel, { color: theme.textSecondary }]}>Prescription Attachment</Text>
          <View style={styles.uploadRow}>
            <Button
              title={prescriptionAttached ? "Change Prescription" : "Attach Prescription"}
              onPress={handleMockUpload}
              variant={prescriptionAttached ? "secondary" : "primary"}
              disabled={loading}
              style={styles.uploadButton}
            />
            {prescriptionAttached ? (
              <View style={styles.successBadge}>
                <SymbolView name="checkmark.circle.fill" size={20} tintColor="#10B981" />
                <Text style={styles.successText}>Attached</Text>
              </View>
            ) : (
              <Text style={[styles.pendingText, { color: theme.textSecondary }]}>Required</Text>
            )}
          </View>
          {errors.prescription && (
            <Text style={[styles.errorText, { color: '#EF4444' }]}>{errors.prescription}</Text>
          )}

          <Button
            title="Create Order"
            onPress={handleSubmit}
            loading={loading && prescriptionAttached}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  uploadButton: {
    flex: 1,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  successText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 16,
  },
});
