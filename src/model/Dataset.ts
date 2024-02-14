
// import {CourseSection} from "./CourseSection";

import {InsightDatasetKind} from "../controller/IInsightFacade";
import {CourseSection} from "./CourseSection";


export class Dataset {
	private id: string;
	private kind: InsightDatasetKind;
	private sections: CourseSection[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.sections = [];
	}

	public static fromObject(obj: any): Dataset {
		const dataset = new Dataset(obj.id, obj.kind);
		obj.sections.forEach((sectionObj: any) => {
			const section = new CourseSection(
				sectionObj.uuid,
				sectionObj.id,
				sectionObj.title,
				sectionObj.instructor,
				sectionObj.dept,
				sectionObj.avg,
				sectionObj.pass,
				sectionObj.fail,
				sectionObj.audit,
				sectionObj.year
			);
			dataset.addSection(section);
		});
		return dataset;
	}

	public getKind() {
		return this.kind;
	}

	public getID() {
		return this.id;
	}

	public addSection(section: CourseSection) {
		this.sections.push(section);
	}

	public getSections(): CourseSection[] {
		return this.sections;
	}
}

