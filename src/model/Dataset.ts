import {CourseSection} from "./CourseSection";
import {InsightDatasetKind} from "../controller/IInsightFacade";

//	Interface to define how a dataset should look like
//	Has an array of section objects(container), and an id for the dataset

export class Dataset{
	private id: string;
	private kind: InsightDatasetKind;
	private sections: CourseSection[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.sections = [];
	}

	public getKind(){
		return this.kind;
	}

	public getID(){
		return this.id;
	}

	public addSection(section: CourseSection){
		this.sections.push(section);
	}

	public getSections(): CourseSection[]{
		return this.sections;
	}
}
