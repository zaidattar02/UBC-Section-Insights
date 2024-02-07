
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
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.year = year;
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
