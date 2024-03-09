// import {CourseSection} from "./CourseSection";

import {InsightDatasetKind} from "../controller/IInsightFacade";
import {CourseSection} from "./CourseSection";
import {Room} from "./Room";

export class Dataset {
	private id: string;
	private kind: InsightDatasetKind;
	private entries: Array<CourseSection | Room>;

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.entries = [];
	}

	public static fromObject(obj: any): Dataset {
		const dataset = new Dataset(obj.id, obj.kind);
		if (obj.kind === InsightDatasetKind.Sections) {
			obj.entries.forEach((entryObj: any) => {
				const entry = new CourseSection(
					entryObj.uuid,
					entryObj.id,
					entryObj.title,
					entryObj.instructor,
					entryObj.dept,
					entryObj.avg,
					entryObj.pass,
					entryObj.fail,
					entryObj.audit,
					entryObj.year
				);
				dataset.addEntry(entry);
			});
		} else if (obj.kind === InsightDatasetKind.Rooms) {
			obj.entries.forEach((entryObj: any) => {
				const entry = new Room(
					entryObj.fullname,
					entryObj.shortname,
					entryObj.number,
					entryObj.name,
					entryObj.address,
					entryObj.lat,
					entryObj.lon,
					entryObj.seats,
					entryObj.type,
					entryObj.furniture,
					entryObj.href
				);
				dataset.addEntry(entry);
			});
		}
		return dataset;
	}


	// public static fromObject(obj: any): Dataset {
	// 	const dataset = new Dataset(obj.id, obj.kind);
	// 	obj.entries.forEach((sectionObj: any) => {
	// 		const section = new CourseSection(
	// 			sectionObj.uuid,
	// 			sectionObj.id,
	// 			sectionObj.title,
	// 			sectionObj.instructor,
	// 			sectionObj.dept,
	// 			sectionObj.avg,
	// 			sectionObj.pass,
	// 			sectionObj.fail,
	// 			sectionObj.audit,
	// 			sectionObj.year
	// 		);
	// 		dataset.addEntry(section);
	// 	});
	// 	return dataset;
	// }

	public getKind() {
		return this.kind;
	}

	public getID() {
		return this.id;
	}

	public isRoom(): this is Room{
		return this.kind === InsightDatasetKind.Rooms;
	}

	public isSection(): this is CourseSection{
		return this.kind === InsightDatasetKind.Sections;
	}

	public addEntry(entry: CourseSection | Room) {
		this.entries.push(entry);
	}

	public getEntries(): Array<CourseSection | Room> {
		return this.entries;
	}
}
