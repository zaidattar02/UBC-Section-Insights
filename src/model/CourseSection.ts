
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

	private alwaysString(value: any): string{
		if(typeof value !== "string"){
			return String(value);
		}
		return value;
	}

	private alwaysNumber(value: any): number {
		if (typeof value !== "number") {
			const numberValue = Number(value);
			if (isNaN(numberValue)) {
				throw new Error("Cannot cast to number");
			}
			return numberValue;
		}
		return value;
	}
}

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
