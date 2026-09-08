import { createElement } from 'react';
import { View } from 'react-native';

type DateTimePickerEvent = {
  type: 'set' | 'dismissed';
};

type DateTimePickerProps = {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: string;
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
};

function toInputValue(value: Date, mode: DateTimePickerProps['mode']) {
  if (Number.isNaN(value.getTime())) {
    const now = new Date();
    return mode === 'time' ? '00:00' : now.toISOString().split('T')[0];
  }

  if (mode === 'time') {
    return value.toTimeString().slice(0, 5);
  }

  return value.toISOString().split('T')[0];
}

export default function DateTimePicker({
  value,
  mode = 'date',
  onChange,
}: DateTimePickerProps) {
  return (
    <View style={{ padding: 16 }}>
      {createElement('input', {
        type: mode === 'time' ? 'time' : 'date',
        value: toInputValue(value, mode),
        onChange: (event: { target: { value: string } }) => {
          if (!event.target.value) {
            onChange?.({ type: 'dismissed' }, undefined);
            return;
          }

          const nextDate =
            mode === 'time'
              ? new Date(`1970-01-01T${event.target.value}`)
              : new Date(event.target.value);

          onChange?.({ type: 'set' }, nextDate);
        },
        style: {
          fontSize: 16,
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ccc',
          width: '100%',
        },
      })}
    </View>
  );
}
