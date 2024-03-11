export function alwaysString(value: any): string {
	if (typeof value !== "string") {
		return String(value);
	}
	return value;
}

export function alwaysNumber(value: any): number {
	// First, check if it's already a valid number.
	if (typeof value === "number") {
		return value;
	}

	// If it's not a number, we assume it's a string and try to clean it up.
	// This regex removes any characters that are not digits, decimal points, or minus signs.
	const cleanedValue = String(value).replace(/[^0-9.-]+/g, "");

	// Now try to convert the cleaned string to a number.
	const numberValue = Number(cleanedValue);

	// Check if the resulting number is actually a number and not NaN.
	if (isNaN(numberValue)) {
		throw new Error("Cannot cast to number");
	}

	return numberValue;
}
