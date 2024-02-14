export function assertTrue(condition: boolean, msg: string, ErrorType: new (message?: string) => Error) {
	throwErrorOnAssertion(true, condition, msg, ErrorType);
}

export function assertFalse(condition: boolean, msg: string, ErrorType: new (message?: string) => Error) {
	throwErrorOnAssertion(false, condition, msg, ErrorType);
}

export function throwErrorOnAssertion(assertion: boolean, condition: boolean, msg: string,
	ErrorType: new (message?: string) => Error) {
	if (assertion !== condition) {
		const error = new ErrorType(msg);
		error.message = msg;
		throw error;
	}
}
