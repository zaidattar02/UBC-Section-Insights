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
		if (obj.kind == InsightDatasetKind.Rooms) {
			obj.entries.forEach((entry: any) => {
			const room = new Room(
					entry.fullName,
					entry.shortname,
					entry.number,
					entry.name,
					entry.address,
					entry.lat,
					entry.lon,
					entry.seats,
					entry.type,
					entry.furniture,
					entry.href
				);
				dataset.addEntry(room);
			});
		} else {
			obj.entries.forEach((entry: any) => {
				const section = new CourseSection(
					entry.uuid,
					entry.id,
					entry.title,
					entry.instructor,
					entry.dept,
					entry.avg,
					entry.pass,
					entry.fail,
					entry.audit,
					entry.year
				);
				dataset.addEntry(section);
			});
		}
		return dataset;
	}

	public getKind() {
		return this.kind;
	}

	public getID() {
		return this.id;
	}

	public isRoom(): this is Room {
		return this.kind === InsightDatasetKind.Rooms;
	}

	public isSection(): this is CourseSection {
		return this.kind === InsightDatasetKind.Sections;
	}

	public addEntry(section: CourseSection | Room) {
		this.entries.push(section);
	}

	public getSections(): Array<CourseSection | Room> {
		return this.entries;
	}
}
