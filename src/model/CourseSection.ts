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
