
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

	//  validate here
	//	check specifications
	//	cast year as a number
	//	helper functions for consistent cases i.e always string, always number
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
		year: number,
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

	//	validate differently, dont cast just return
	// private alwaysString(value: any): string{
	// 	if(typeof value !== "string"){
	// 		return String(value);
	// 	}
	// 	return value;
	// }
	private alwaysString(value: any): string{
		if(typeof value !== "string"){
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
export const CourseSectionNumericalKeyList: CourseSectionNumericalKeys[] = ["avg", "pass", "fail", "audit", "year"];

export type CourseSectionStringKeys = "uuid" | "id" | "title" | "instructor" | "dept";
export const CourseSectionStringKeyList: CourseSectionStringKeys[] = ["uuid", "id", "title", "instructor", "dept"];

export type CourseSelectionKey = keyof CourseSection;
export const CourseSelectionKeyList = [...CourseSectionNumericalKeyList, ...CourseSectionStringKeyList];

export interface SectionRaw {
	tier_eighty_five: number;
	tier_ninety:      number;
	Title:            string;
	Section:          string;
	Detail:           string;
	tier_seventy_two: number;
	Other:            number;
	Low:              number;
	tier_sixty_four:  number;
	id:               number;
	tier_sixty_eight: number;
	tier_zero:        number;
	tier_seventy_six: number;
	tier_thirty:      number;
	tier_fifty:       number;
	Professor:        string;
	Audit:            number;
	tier_g_fifty:     number;
	tier_forty:       number;
	Withdrew:         number;
	Year:             string;
	tier_twenty:      number;
	Stddev:           number;
	Enrolled:         number;
	tier_fifty_five:  number;
	tier_eighty:      number;
	tier_sixty:       number;
	tier_ten:         number;
	High:             number;
	Course:           string;
	Session:          string;
	Pass:             number;
	Fail:             number;
	Avg:              number;
	Campus:           string;
	Subject:          string;
}
