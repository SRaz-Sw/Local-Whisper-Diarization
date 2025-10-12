import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Simple number formatting utilities
const formatNumber = (value) => {
	if (!value && value !== 0) return '';
	return parseInt(value).toLocaleString();
};

const parseNumber = (value) => {
	if (!value) return 0;
	// Remove all non-numeric characters
	const cleaned = value.replace(/[^\d]/g, '');
	return parseInt(cleaned) || 0;
};

// Clean formatted input component - ShadCN style
const FormattedNumberInput = React.memo(({ value, onChange, onBlur, ...props }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState('');

	const handleFocus = useCallback(
		(e) => {
			setIsEditing(true);
			// Show raw number when editing for easier input
			setEditValue(value ? value.toString() : '');
			if (props.onFocus) props.onFocus(e);
		},
		[value, props]
	);

	const handleChange = useCallback(
		(e) => {
			const inputValue = e.target.value;
			setEditValue(inputValue);

			// Parse and update the numeric value
			const numericValue = parseNumber(inputValue);
			onChange(numericValue);
		},
		[onChange]
	);

	const handleKeyDown = useCallback(
		(e) => {
			if (e.key === 'Enter') {
				e.target.blur();
			}
			if (props.onKeyDown) props.onKeyDown(e);
		},
		[props]
	);

	const handleBlurEvent = useCallback(
		(e) => {
			setIsEditing(false);
			if (onBlur) onBlur(e);
		},
		[onBlur]
	);

	const displayValue = isEditing ? editValue : formatNumber(value);

	return (
		<Input
			{...props}
			value={displayValue}
			onChange={handleChange}
			onFocus={handleFocus}
			onBlur={handleBlurEvent}
			onKeyDown={handleKeyDown}
			inputMode="numeric"
		/>
	);
});

FormattedNumberInput.displayName = 'FormattedNumberInput';

export { FormattedNumberInput };
