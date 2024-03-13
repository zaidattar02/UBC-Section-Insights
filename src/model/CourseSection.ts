export class CourseSection {
	private uuid: string;
	private id: string;
	private title: string;
	private instructor: string;
	private dept: string;
	private avg: number;
	private pass: number;
	private fail: number;
	private audit: number;
	private year: number;
	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		avg: number,
		pass: number,
		fail: number,
		audit: number,
		year: number
	) {
		this.uuid = this.alwaysString(uuid);
		this.id = this.alwaysString(id);
		this.title = this.alwaysString(title);
		this.instructor = this.alwaysString(instructor);
		this.dept = this.alwaysString(dept);
		this.avg = this.alwaysNumber(avg);
		this.pass = this.alwaysNumber(pass);
		this.fail = this.alwaysNumber(fail);
		this.audit = this.alwaysNumber(audit);
		this.year = this.alwaysNumber(year);
	}

	private alwaysString(value: any): string {
		if (typeof value !== "string") {
			return String(value);
		}
		return value;
	}

	private alwaysNumber(value: any): number {
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
}

export type CourseSectionNumericalKeys = "avg" | "pass" | "fail" | "audit" | "year";
export const CourseSectionNumericalKeyList: string[] = ["avg", "pass", "fail", "audit", "year"];

export type CourseSectionStringKeys = "uuid" | "id" | "title" | "instructor" | "dept";
export const CourseSectionStringKeyList: string[] = ["uuid", "id", "title", "instructor", "dept"];

export type CourseSelectionKey = CourseSectionNumericalKeys | CourseSectionStringKeys;
export const CourseSelectionKeyList: string[] = [...CourseSectionNumericalKeyList, ...CourseSectionStringKeyList];

