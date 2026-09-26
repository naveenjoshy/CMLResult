'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDateDDMMYYYY, parseDateDDMMYYYY } from '@/lib/dateUtils';

export default function DateInput({
  id,
  name,
  className = 'form-input',
  value = '',
  maxDate = '',
  required = false,
  onDateChange,
  ...inputProps
}) {
  const [dateText, setDateText] = useState(() => formatDateDDMMYYYY(value));
  const previousValue = useRef(value || '');

  useEffect(() => {
    const currentValue = value || '';
    if (currentValue !== previousValue.current) {
      previousValue.current = currentValue;
      setDateText(formatDateDDMMYYYY(currentValue));
    }
  }, [value]);

  const handleChange = event => {
    const nextText = event.target.value;
    setDateText(nextText);

    if (!nextText) {
      event.currentTarget.setCustomValidity('');
      previousValue.current = '';
      onDateChange('');
      return;
    }

    const isoDate = parseDateDDMMYYYY(nextText);
    if (!isoDate) {
      event.currentTarget.setCustomValidity('Enter a valid date as DD-MM-YYYY.');
      return;
    }
    if (maxDate && isoDate > maxDate) {
      event.currentTarget.setCustomValidity('Date cannot be in the future.');
      return;
    }

    event.currentTarget.setCustomValidity('');
    previousValue.current = isoDate;
    onDateChange(isoDate);
  };

  return (
    <input
      {...inputProps}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
      placeholder="DD-MM-YYYY"
      className={className}
      value={dateText}
      required={required}
      onChange={handleChange}
    />
  );
}